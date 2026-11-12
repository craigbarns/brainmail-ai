import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Google Analytics 4 Measurement Protocol : événements serveur, sans cookie.
// Aucune donnée personnelle n'est envoyée — l'identifiant client est l'uuid
// interne, stable et non réversible. Best effort : un échec n'affecte jamais
// le parcours du client.
const eventSchema = z.object({
  client_id: z.string().min(1),
  name: z.string().min(1),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export function analyticsConfigured() {
  return Boolean(
    process.env.GA4_MEASUREMENT_ID &&
      process.env.GA4_MEASUREMENT_ID.startsWith('G-') &&
      process.env.GA4_API_SECRET,
  );
}

export async function ga4Event(
  clientId: string,
  name: string,
  params: Record<string, string | number | boolean> = {},
) {
  if (!analyticsConfigured()) return;
  const payload = eventSchema.safeParse({ client_id: clientId, name, params });
  if (!payload.success) return;
  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`,
      {
        method: 'POST',
        body: JSON.stringify({
          client_id: payload.data.client_id,
          user_id: payload.data.client_id,
          events: [
            { name: payload.data.name, params: { engagement_time_msec: 1, ...payload.data.params } },
          ],
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
  } catch {
    // Ignoré : la mesure ne doit jamais casser le parcours.
  }
}

export const newAnalyticsClientId = () => randomUUID();
