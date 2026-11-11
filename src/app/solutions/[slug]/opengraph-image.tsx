import { ogImage, OG_SIZE } from '@/lib/ogImage';
import { SEO_PAGES } from '@/lib/seoPages';
export const alt = 'BRAINMAIL — gestion du courrier par IA';
export const size = OG_SIZE;
export const contentType = 'image/png';
export function generateStaticParams() {
  return SEO_PAGES.map((p) => ({ slug: p.slug }));
}
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = SEO_PAGES.find((x) => x.slug === slug);
  return ogImage({
    eyebrow: page?.eyebrow || 'Solutions par métier',
    title: page?.h1 || 'Gestion du courrier par IA',
    quote: 'la date est citée dans le document',
  });
}
