import { ogImage, OG_SIZE } from '@/lib/ogImage';
export const alt = 'BRAINMAIL — Aucun courrier oublié, aucune échéance perdue';
export const size = OG_SIZE;
export const contentType = 'image/png';
export default function Image() {
  return ogImage({
    eyebrow: 'Assistant courrier pour dirigeants et cabinets',
    title: 'Aucun courrier oublié. Aucune échéance perdue.',
    quote: 'à régler au plus tard le 15 décembre 2026',
  });
}
