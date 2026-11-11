// Facts shared by every public page and by the structured data: one source,
// so the site, its JSON-LD and llms.txt never disagree on a price or a date.
export const SITE = {
  url: 'https://www.brainmail.ai',
  app: process.env.NEXT_PUBLIC_APP_URL || 'https://app.brainmail.ai',
  name: 'BRAINMAIL.ai',
  publisher: 'WeMade SASU',
  city: 'Marseille',
  email: 'gregory@brainmail.ai',
  description:
    'BRAINMAIL centralise le courrier papier et les emails de vos sociétés, extrait les échéances avec leur citation dans le document, et prépare les réponses que vous validez.',
};
export const PLANS = [
  { name: 'Solo', price: '29', who: '1 société', docs: '50 courriers par mois' },
  { name: 'Pro', price: '59', who: '3 sociétés', docs: '200 courriers par mois' },
  { name: 'Cabinet', price: '149', who: '10 sociétés', docs: '1 000 courriers par mois' },
];
export const PLAN_OFFERS = PLANS.map((p) => ({
  '@type': 'Offer',
  name: p.name,
  price: p.price,
  priceCurrency: 'EUR',
  description: `${p.who}, ${p.docs}`,
  url: `${SITE.url}/#tarifs`,
  availability: 'https://schema.org/InStock',
  priceSpecification: {
    '@type': 'UnitPriceSpecification',
    price: p.price,
    priceCurrency: 'EUR',
    valueAddedTaxIncluded: false,
    unitText: 'mois',
  },
}));
// Editorial dates of the public pages. Bump UPDATED when the content changes:
// it feeds the sitemap, the article markup and the visible "mis à jour le".
export const PUBLISHED = new Date('2026-11-10T09:00:00+01:00');
export const UPDATED = new Date('2026-11-11T09:00:00+01:00');
export const isoDate = (d: Date) => d.toISOString();
export const frDate = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
