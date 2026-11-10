'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, BadgeCheck, CreditCard } from 'lucide-react';

type Status = {
  plan: string;
  label: string;
  status: string;
  active: boolean;
  currentPeriodEnd: string | null;
  limits: { monthlyDocs: number; workspaces: number };
};

const OFFERS = [
  {
    plan: 'solo',
    name: 'Solo',
    price: '29',
    items: ['1 société', '50 courriers par mois', 'Scan, analyse, échéances', 'Rappels email'],
  },
  {
    plan: 'pro',
    name: 'Pro',
    price: '59',
    items: ['3 sociétés', '200 courriers par mois', 'Réception email incluse', 'Rappels email'],
  },
  {
    plan: 'cabinet',
    name: 'Cabinet',
    price: '149',
    items: [
      '10 sociétés, +15 € chacune',
      '1 000 courriers par mois',
      'Support prioritaire',
      'Onboarding accompagné',
    ],
  },
];

export default function AbonnementPage() {
  // useSearchParams must run inside a Suspense boundary during prerender.
  return (
    <Suspense fallback={<div className="app-shell" />}>
      <Abonnement />
    </Suspense>
  );
}

function Abonnement() {
  const params = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/billing/status', { credentials: 'include' });
        if (res.ok) setStatus(await res.json());
        else location.href = '/login';
      } catch {
        setError('Statut indisponible.');
      }
    })();
  }, []);

  async function go(path: string, plan?: string) {
    setBusy(plan || path);
    setError('');
    try {
      const res = await fetch(`/api/billing/${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan ? { plan } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Opération impossible.');
      if (data.url) location.href = data.url;
      else void refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function refresh() {
    const res = await fetch('/api/billing/status', { credentials: 'include' });
    if (res.ok) setStatus(await res.json());
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-icon">
            <CreditCard size={22} />
          </span>
          BRAINMAIL<span className="brand-ai">.ai</span>
        </a>
        <Link className="text-button" href="/app">
          <ArrowLeft size={15} /> Retour aux courriers
        </Link>
      </aside>
      <main className="content">
        {params.get('checkout') === 'merci' && (
          <div className="form-card" style={{ borderColor: 'var(--green)' }}>
            <BadgeCheck size={18} /> Paiement reçu — l&apos;abonnement s&apos;active en quelques
            secondes.
          </div>
        )}
        {status ? (
          <div className="form-card">
            <h2>
              Palier actuel : {status.label}
              {status.active ? ' — actif' : ' — sans abonnement'}
            </h2>
            <p>
              {status.limits.workspaces} société{status.limits.workspaces > 1 ? 's' : ''} ·{' '}
              {status.limits.monthlyDocs} courriers/mois
              {status.currentPeriodEnd
                ? ` · renouvellement le ${new Date(status.currentPeriodEnd).toLocaleDateString('fr-FR')}`
                : ''}
            </p>
            {status.active && (
              <button
                className="button"
                disabled={busy === 'portal'}
                onClick={() => void go('portal')}
              >
                {busy === 'portal' ? 'Ouverture…' : "Gérer l'abonnement (factures, carte, résiliation)"}
              </button>
            )}
          </div>
        ) : (
          <p className="eyebrow-small">Chargement…</p>
        )}
        {error && <p className="error">{error}</p>}
        <div className="pricing-grid">
          {OFFERS.map((o) => (
            <article
              key={o.plan}
              className={status?.plan === o.plan ? 'price-card best' : 'price-card'}
            >
              {status?.plan === o.plan && <span className="best-tag">Votre palier</span>}
              <h3>{o.name}</h3>
              <p className="price">
                {o.price} €<small>HT / mois</small>
              </p>
              <ul>
                {o.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
              <button
                className="button full-width"
                disabled={busy === o.plan || status?.plan === o.plan}
                onClick={() => void go('checkout', o.plan)}
              >
                {busy === o.plan ? 'Redirection…' : status?.plan === o.plan ? 'Palier actuel' : `Choisir ${o.name}`}
              </button>
            </article>
          ))}
        </div>
        <p className="footnote">
          Paiement sécurisé par Stripe. Sans engagement, résiliable à tout moment. TVA appliquée
          selon votre situation par Stripe.
        </p>
      </main>
    </div>
  );
}
