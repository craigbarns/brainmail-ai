import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Only the API is closed to crawling. The private screens (/app, /login,
        // /scan) answer with "X-Robots-Tag: noindex" instead: a crawler must be
        // allowed to fetch a page to learn that it must not be indexed.
        disallow: ['/api'],
      },
    ],
    sitemap: 'https://www.brainmail.ai/sitemap.xml',
  };
}
