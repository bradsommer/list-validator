import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/legal/', '/docs/'],
        disallow: [
          '/import',
          '/rules',
          '/import-questions',
          '/column-headings',
          '/billing',
          '/history',
          '/select-account',
          '/setup-account',
          '/accept-invite',
          '/admin/',
          '/company-admin/',
          '/contacts',
          '/companies',
          '/deals',
        ],
      },
    ],
  };
}
