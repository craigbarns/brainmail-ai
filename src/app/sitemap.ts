import type { MetadataRoute } from 'next';
import { SEO_PAGES } from '@/lib/seoPages';
import { SITE, UPDATED } from '@/lib/site';

// Only the public marketing site is indexed; the app lives on app.brainmail.ai
// behind authentication and is disallowed in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const legal = new Date('2026-11-10T00:00:00+01:00');
  return [
    {
      url: `${SITE.url}/`,
      lastModified: UPDATED,
      changeFrequency: 'weekly',
      priority: 1,
      images: [`${SITE.url}/opengraph-image`],
    },
    {
      url: `${SITE.url}/comment-ca-marche`,
      lastModified: UPDATED,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${SITE.url}/solutions`,
      lastModified: UPDATED,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...SEO_PAGES.map((p) => ({
      url: `${SITE.url}/solutions/${p.slug}`,
      lastModified: UPDATED,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      images: [`${SITE.url}/solutions/${p.slug}/opengraph-image`],
    })),
    {
      url: `${SITE.url}/legal/mentions-legales`,
      lastModified: legal,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    { url: `${SITE.url}/legal/cgv`, lastModified: legal, changeFrequency: 'yearly', priority: 0.3 },
    {
      url: `${SITE.url}/legal/confidentialite`,
      lastModified: legal,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
