'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components/PublicLayout';

export interface CrmConfig {
  name: string;
  slug: string;
  headline: string;
  subheadline: string;
  painPoints: {
    title: string;
    description: string;
  }[];
  features: {
    title: string;
    description: string;
    icon: string;
    iconBg: string;
    iconColor: string;
  }[];
  ctaText: string;
}

export const crmConfigs: Record<string, CrmConfig> = {
  hubspot: {
    name: 'HubSpot',
    slug: 'hubspot',
    headline: 'Clean Your Data Before It Hits HubSpot',
    subheadline:
      'Stop spending hours cleaning spreadsheets before every HubSpot import. FreshSegments automatically validates, standardizes, and fixes your data so every import is flawless.',
    painPoints: [
      {
        title: 'Messy HubSpot imports waste hours',
        description:
          'Every bad import means time spent finding and fixing errors inside HubSpot — duplicates, malformed emails, inconsistent naming, missing fields. It adds up fast.',
      },
      {
        title: 'HubSpot data hygiene starts before the import',
        description:
          'The best way to keep your HubSpot database clean is to never let dirty data in. FreshSegments catches problems at the source so your team can trust the CRM.',
      },
      {
        title: 'Spreadsheet cleanup is tedious and error-prone',
        description:
          'Manually scanning rows for bad phone numbers, inconsistent state names, and duplicate contacts is slow work. One missed error can cascade through your workflows and reporting.',
      },
    ],
    features: [
      {
        title: 'HubSpot Property Mapping',
        description:
          'Auto-match your spreadsheet columns to HubSpot properties. FreshSegments remembers your mappings so repeat imports take seconds.',
        icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
      },
      {
        title: 'Email & Phone Validation',
        description:
          'Catch invalid emails and malformed phone numbers before they create bad records in HubSpot. Automatically format numbers to E.164.',
        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Duplicate Detection',
        description:
          'Find duplicate contacts and companies in your spreadsheet before they pollute your HubSpot database. Merge or flag them for review.',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
      },
      {
        title: 'Name & Address Standardization',
        description:
          'Automatically capitalize names, expand state abbreviations, and normalize formatting so your HubSpot data is consistent and professional.',
        icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
    ],
    ctaText: 'Start Cleaning Your HubSpot Data',
  },
};

export function CrmLandingPage({ crm }: { crm: string }) {
  const config = crmConfigs[crm];
  if (!config) return null;

  return (
    <PublicLayout maxWidth="max-w-6xl">
      {/* Hero Section */}
      <section className="text-center pt-8 pb-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
          {config.headline.split(config.name).map((part, i, arr) =>
            i < arr.length - 1 ? (
              <span key={i}>
                {part}
                <span style={{ color: '#0B8377' }}>{config.name}</span>
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </h1>
        <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
          {config.subheadline}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-4 text-white rounded-xl font-semibold text-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: '#0B8377' }}
          >
            Start Free Trial
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          $19.99/month after 14-day free trial. Cancel anytime.
        </p>
      </section>

      {/* HubSpot Integration Banner */}
      {crm === 'hubspot' && (
        <div className="mb-8 rounded-xl border-2 border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-6 sm:p-8 text-center">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-white rounded-full mb-3" style={{ backgroundColor: '#0B8377' }}>
            New
          </span>
          <h2 className="text-2xl font-bold text-gray-900">Now Integrates with HubSpot</h2>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            FreshSegments now pulls in all properties for Contacts, Companies, and Deals automatically from your HubSpot account — making it easier than ever to update your spreadsheet column headings to match your CRM.
          </p>
        </div>
      )}

      {/* Pain Points */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">
            Stop Spending Time Cleaning Spreadsheets
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Every hour spent on manual data cleanup is an hour wasted. FreshSegments automates the work so your {config.name} data is always import-ready.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {config.painPoints.map((point) => (
            <div key={point.title} className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{point.title}</h3>
              <p className="text-gray-600 leading-relaxed">{point.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">
            Everything You Need for Clean {config.name} Data
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Powerful validation and transformation tools built for {config.name} imports.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {config.features.map((feature) => (
            <div key={feature.title} className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <svg className={`w-6 h-6 ${feature.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
          <p className="mt-4 text-lg text-gray-600">Three steps to clean {config.name} data.</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex items-start gap-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: '#0B8377' }}>1</div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Upload Your Spreadsheet</h3>
              <p className="mt-2 text-gray-600">Drag and drop your CSV or Excel file. Your data is parsed in your browser and never uploaded to our servers.</p>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: '#0B8377' }}>2</div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Review & Fix Issues</h3>
              <p className="mt-2 text-gray-600">FreshSegments automatically cleans your data and flags anything that needs your attention. See every change before you export.</p>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: '#0B8377' }}>3</div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Import into {config.name}</h3>
              <p className="mt-2 text-gray-600">Download your validated, {config.name}-ready file and import it with confidence. No more errors, no more cleanup.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="bg-gradient-to-br from-teal-50 to-white rounded-3xl p-8 sm:p-12 border-2 border-teal-200 text-center">
          <h2 className="text-3xl font-bold text-gray-900">{config.ctaText}</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Join teams who trust FreshSegments to clean their data before every {config.name} import. Start your 14-day free trial today.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-block px-8 py-4 text-white rounded-xl font-semibold text-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#0B8377' }}
            >
              Start Free Trial
            </Link>
            <p className="mt-4 text-sm text-gray-500">$19.99/month after trial. Cancel anytime.</p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
