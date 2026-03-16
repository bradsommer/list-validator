import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/PublicLayout';

export const metadata: Metadata = {
  title: 'Resources | FreshSegments',
  description:
    'Explore FreshSegments resources including our Help Center, documentation, and CRM-specific guides for HubSpot.',
};

const crmPages = [
  { name: 'HubSpot', slug: 'hubspot', description: 'Clean and validate your data before importing into HubSpot.' },
];

export default function ResourcesPage() {
  return (
    <PublicLayout maxWidth="max-w-6xl">
      <div className="space-y-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Resources</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to get the most out of FreshSegments — from getting started guides to CRM-specific tips.
          </p>
        </div>

        {/* Help Center */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Help Center</h2>
          <Link
            href="/documentation"
            className="block rounded-xl border border-gray-200 bg-white p-8 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#E6F5F3' }}>
                <svg className="w-6 h-6" style={{ color: '#0B8377' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                  Help Center &amp; Documentation
                </h3>
                <p className="mt-1 text-gray-600">
                  Get started with FreshSegments, learn about validation rules, import questions, output headings, and integrations.
                </p>
              </div>
            </div>
          </Link>
        </section>

        {/* CRMs */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">CRMs</h2>
          <p className="text-gray-600 mb-6">
            Learn how FreshSegments helps you clean and validate data for your specific CRM.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {crmPages.map((crm) => (
              <Link
                key={crm.slug}
                href={`/resources/${crm.slug}`}
                className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow group"
              >
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                  {crm.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{crm.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
