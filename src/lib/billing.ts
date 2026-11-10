import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { query, transaction } from './db';
import { HttpError } from './security';

// Facturation Stripe : l'abonnement appartient à l'utilisateur. Un palier borne
// le nombre de sociétés (workspaces) et de courriers analysés par mois.
export const PLANS = {
  solo: { label: 'Solo', priceEnv: 'STRIPE_PRICE_SOLO', monthlyDocs: 50, workspaces: 1 },
  pro: { label: 'Pro', priceEnv: 'STRIPE_PRICE_PRO', monthlyDocs: 200, workspaces: 3 },
  cabinet: { label: 'Cabinet', priceEnv: 'STRIPE_PRICE_CABINET', monthlyDocs: 1000, workspaces: 10 },
} as const;
export type PlanName = keyof typeof PLANS;
export const planSchema = z.enum(['solo', 'pro', 'cabinet']);

// Sans abonnement : un essai limité, pas un compte gratuit permanent.
export const TRIAL = { label: 'Essai', monthlyDocs: 20, workspaces: 1 };

export function planLimits(plan: string | null | undefined) {
  return plan && plan in PLANS ? PLANS[plan as PlanName] : TRIAL;
}

// The subscription belongs to the user, so limits are read per user.
export async function billingOf(userId: string) {
  const [row] = await query<{
    plan: string;
    subscription_status: string;
    current_period_end: Date | null;
  }>('SELECT plan,subscription_status,current_period_end FROM billing WHERE user_id=$1', [userId]);
  const plan = row?.plan ?? 'none';
  const active = row?.subscription_status === 'active' || row?.subscription_status === 'trialing';
  return {
    plan,
    label: planLimits(plan).label,
    status: row?.subscription_status ?? 'inactive',
    active,
    currentPeriodEnd: row?.current_period_end ?? null,
    limits: planLimits(plan),
  };
}

export async function gateWorkspaceCreation(userId: string) {
  const b = await billingOf(userId);
  const [c] = await query<{ n: number }>(
    'SELECT count(*)::int AS n FROM memberships WHERE user_id=$1',
    [userId],
  );
  if (c.n >= b.limits.workspaces)
    throw new HttpError(
      402,
      `Votre palier ${b.label} autorise ${b.limits.workspaces} société${b.limits.workspaces > 1 ? 's' : ''}. Passez au palier supérieur pour en ajouter.`,
    );
  return b;
}

// Monthly cap per workspace, replaced the fixed 50/day reception cap.
export async function gateMonthlyDocs(workspaceId: string, userId: string) {
  const b = await billingOf(userId);
  const [c] = await query<{ n: number }>(
    "SELECT count(*)::int AS n FROM documents WHERE workspace_id=$1 AND created_at>=date_trunc('month',now())",
    [workspaceId],
  );
  if (c.n >= b.limits.monthlyDocs)
    throw new HttpError(
      402,
      `Plafond de ${b.limits.monthlyDocs} courriers par mois atteint (palier ${b.label}). Passez au palier supérieur depuis la page Abonnement.`,
    );
  return b;
}

const STRIPE_API = 'https://api.stripe.com/v1';
function stripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, 'Facturation non configurée (Stripe).');
  return key;
}

// Minimal Stripe REST calls with fetch — the app adds no SDK dependency.
export async function stripeRequest(path: string, params: Record<string, string> = {}) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok)
    throw new HttpError(502, `Erreur Stripe : ${String((data.error as { message?: string })?.message ?? res.status)}`);
  return data;
}

async function ensureCustomer(userId: string, email: string) {
  const [row] = await query<{ stripe_customer_id: string | null }>(
    'SELECT stripe_customer_id FROM billing WHERE user_id=$1',
    [userId],
  );
  if (row?.stripe_customer_id) return row.stripe_customer_id;
  const customer = await stripeRequest('/customers', { email });
  await transaction((db) =>
    db.query(
      'INSERT INTO billing(user_id,stripe_customer_id) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id=EXCLUDED.stripe_customer_id',
      [userId, customer.id as string],
    ),
  );
  return customer.id as string;
}

export async function createCheckout(userId: string, email: string, plan: PlanName, appUrl: string) {
  const price = process.env[PLANS[plan].priceEnv];
  if (!price) throw new HttpError(503, 'Prix non configuré pour ce palier.');
  const customer = await ensureCustomer(userId, email);
  const session = await stripeRequest('/checkout/sessions', {
    mode: 'subscription',
    customer,
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    // WeMade is VAT-registered: Stripe Tax adds 20 % for FR customers and
    // reverses it for EU businesses with a valid VAT number, collected here.
    'automatic_tax[enabled]': 'true',
    'tax_id_collection[enabled]': 'true',
    'customer_update[address]': 'auto',
    'customer_update[name]': 'auto',
    // Founder-pilot codes (PILOTE: 100 % × 3 months, 5 redemptions max).
    allow_promotion_codes: 'true',
    success_url: `${appUrl}/app/abonnement?checkout=merci`,
    cancel_url: `${appUrl}/app/abonnement`,
    'subscription_data[metadata][user_id]': userId,
    'subscription_data[metadata][plan]': plan,
  });
  return session.url as string;
}

export async function createPortal(userId: string, appUrl: string) {
  const [row] = await query<{ stripe_customer_id: string | null }>(
    'SELECT stripe_customer_id FROM billing WHERE user_id=$1',
    [userId],
  );
  if (!row?.stripe_customer_id) throw new HttpError(400, "Aucun abonnement à gérer. Choisissez d'abord un palier.");
  const session = await stripeRequest('/billing_portal/sessions', {
    customer: row.stripe_customer_id,
    return_url: `${appUrl}/app/abonnement`,
  });
  return session.url as string;
}

// Stripe signature scheme: signed payload is `${t}.${body}`, HMAC-SHA256 with
// the webhook secret, compared in constant time against each v1 signature.
export function verifyStripeSignature(secret: string, body: string, header: string | null): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=') as [string, string]),
  );
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${body}`).digest();
  const given = Buffer.from(v1, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

const subObj = z.object({
  id: z.string(),
  status: z.string(),
  customer: z.string(),
  'current_period_end': z.number().optional(),
  'items': z.object({
    data: z.array(z.object({ price: z.object({ id: z.string() }) })).min(1),
  }),
  'metadata': z.record(z.string(), z.string()).optional(),
});

// Applies a subscription state to the billing row matched by subscription id,
// falling back to the user id carried in the checkout metadata.
export async function applySubscription(sub: Record<string, unknown>) {
  const s = subObj.parse(sub);
  const priceId = s.items.data[0].price.id;
  const plan =
    (Object.entries(PLANS).find(([, p]) => process.env[p.priceEnv] === priceId)?.[0] as
      | PlanName
      | undefined) ?? null;
  const period = s.current_period_end ? new Date(s.current_period_end * 1000) : null;
  await transaction(async (db) => {
    const { rows } = await db.query<{ user_id: string }>(
      'SELECT user_id FROM billing WHERE stripe_subscription_id=$1',
      [s.id],
    );
    const userId = rows[0]?.user_id ?? s.metadata?.user_id;
    if (!userId) return;
    await db.query(
      `INSERT INTO billing(user_id,plan,stripe_customer_id,stripe_subscription_id,subscription_status,current_period_end,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,now())
       ON CONFLICT(user_id) DO UPDATE SET plan=EXCLUDED.plan,stripe_customer_id=EXCLUDED.stripe_customer_id,
       stripe_subscription_id=EXCLUDED.stripe_subscription_id,subscription_status=EXCLUDED.subscription_status,
       current_period_end=EXCLUDED.current_period_end,updated_at=now()`,
      [userId, plan ?? 'none', s.customer, s.id, s.status, period],
    );
  });
}

export async function handleStripeEvent(event: StripeEvent) {
  const obj = event.data?.object as Record<string, unknown> | undefined;
  if (!obj) return;
  if (event.type === 'checkout.session.completed') {
    const subscriptionId = obj.subscription as string | undefined;
    if (subscriptionId) {
      const sub = await fetchStripe(`/subscriptions/${subscriptionId}`);
      await applySubscription(sub);
    }
  } else if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await applySubscription(obj);
  }
}

// GET with the REST key for follow-up reads (subscription right after checkout).
async function fetchStripe(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${stripeKey()}` },
  });
  if (!res.ok) throw new HttpError(502, 'Erreur Stripe.');
  return (await res.json()) as Record<string, unknown>;
}
