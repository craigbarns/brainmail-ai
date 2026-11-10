import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEO_PAGES } from '@/lib/seoPages';
import { SeoArticle } from '@/components/seoArticle';

export function generateStaticParams() {
  return SEO_PAGES.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await params;
  const page = SEO_PAGES.find((x) => x.slug === p.slug);
  if (!page) return { title: 'BRAINMAIL.ai' };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/solutions/${page.slug}` },
    openGraph: { title: page.title, description: page.description, type: 'article' },
  };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = SEO_PAGES.find((x) => x.slug === slug);
  if (!page) notFound();
  return <SeoArticle page={page} />;
}
