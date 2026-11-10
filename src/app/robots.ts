import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private areas: the authenticated app, the phone scan flow, the API.
        disallow: ['/app', '/api', '/scan', '/login'],
      },
    ],
    sitemap: 'https://www.brainmail.ai/sitemap.xml',
  };
}
