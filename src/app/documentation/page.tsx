'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { FreshSegmentsLogo } from '@/components/FreshSegmentsLogo';

interface DocCard {
  title: string;
  description: string;
  href: string;
  icon: string;
}

const docCards: DocCard[] = [
  {
    title: 'Rules Configuration Guide',
    description: 'Learn how to configure, customize, and write validation rules for your data imports. Covers target fields, execution order, and custom rule development.',
    href: '/docs/rules',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    title: 'Privacy Policy',
    description: 'How we handle, store, and protect your data. Your spreadsheet data is processed in your browser and never stored on our servers.',
    href: '/legal/privacy',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
  {
    title: 'Terms of Use',
    description: 'Our terms of service covering account usage, data processing, subscription billing, and your rights as a user.',
    href: '/legal/terms',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
];

function DocCardComponent({ card }: { card: DocCard }) {
  return (
    <Link
      href={card.href}
      className="group block bg-white rounded-lg border border-gray-200 p-6 hover:border-teal-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 group-hover:bg-teal-100 transition-colors">
          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
            {card.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{card.description}</p>
        </div>
      </div>
    </Link>
  );
}

function DocumentationContent() {
  return (
    <>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
        <p className="text-gray-600 mt-2 text-lg">
          Everything you need to get the most out of FreshSegments.
        </p>
      </div>

      {/* Getting Started */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              FreshSegments helps you validate, clean, and enrich your contact data before importing it into HubSpot.
              Here&apos;s how to get started:
            </p>
            <ol className="list-decimal pl-6 space-y-3">
              <li>
                <strong>Upload your spreadsheet</strong> &mdash; Go to the{' '}
                <Link href="/import" className="text-teal-600 hover:underline">Import</Link> page and drop in your CSV or Excel file.
                Your data is parsed entirely in your browser and never uploaded to our servers.
              </li>
              <li>
                <strong>Map your columns</strong> &mdash; FreshSegments automatically detects common column headers like
                &ldquo;Email&rdquo;, &ldquo;First Name&rdquo;, and &ldquo;Phone&rdquo;. You can review and adjust the
                mappings, or configure custom output headings on the{' '}
                <Link href="/column-headings" className="text-teal-600 hover:underline">Output Headings</Link> page.
              </li>
              <li>
                <strong>Validate and clean</strong> &mdash; Validation rules run automatically to normalize names,
                standardize phone numbers and dates, expand state abbreviations, validate emails, and detect duplicates.
                You can configure which rules are active on the{' '}
                <Link href="/rules" className="text-teal-600 hover:underline">Rules</Link> page.
              </li>
              <li>
                <strong>Review results</strong> &mdash; See a summary of all changes, warnings, and errors.
                Each modification is tracked so you know exactly what was changed and why.
              </li>
              <li>
                <strong>Export</strong> &mdash; Download your cleaned data as a CSV ready for HubSpot import,
                or push it directly if you&apos;ve connected your HubSpot account via{' '}
                <Link href="/admin/integrations" className="text-teal-600 hover:underline">Integrations</Link>.
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Key Concepts */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Concepts</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Transform Rules</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Transform rules modify your data to fix formatting, normalize values, and standardize entries.
              Examples include converting state abbreviations to full names, formatting phone numbers to E.164,
              and properly capitalizing names. Transforms run first so later validation sees clean data.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Validation Rules</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Validation rules check your data for errors without modifying it. They flag issues like
              invalid email addresses, missing required fields, and duplicate records. Errors and warnings
              appear in your validation results for review.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Target Fields</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Each rule has configurable target fields that control which columns it operates on.
              FreshSegments uses smart matching to find the right column even if the header name isn&apos;t
              an exact match &mdash; for example, &ldquo;state&rdquo; will match &ldquo;State/Province&rdquo;
              or &ldquo;State Region&rdquo;.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Object Types</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Rules can be scoped to specific HubSpot object types: Contacts, Companies, or Deals.
              This lets you apply email validation only to Contact imports, or company name cleanup
              only to Company imports. Leave all unchecked to apply a rule to all imports.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Import Questions</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Import questions let you ask the user context-specific questions before validation runs.
              Answers can influence which rules execute or how they behave, enabling dynamic import
              workflows tailored to your team&apos;s needs.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Data Privacy</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your spreadsheet data is processed entirely in your browser. It is never uploaded to
              our servers, stored in our database, or sent to any third party. We only store your
              account settings and rule configuration &mdash; never your actual data.
            </p>
          </div>
        </div>
      </section>

      {/* Detailed Guides & Legal */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Guides &amp; Policies</h2>
        <div className="grid gap-4">
          {docCards.map((card) => (
            <DocCardComponent key={card.href} card={card} />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          <div className="p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Is my data uploaded to your servers?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              No. Your spreadsheet is parsed and processed entirely in your browser using client-side JavaScript.
              The raw file and your row data are never sent to our servers or any third party.
            </p>
          </div>
          <div className="p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Can I use FreshSegments for non-HubSpot imports?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Yes. While FreshSegments is optimized for HubSpot, the cleaned CSV export works with any CRM or system
              that accepts CSV imports. Column mapping and validation are CRM-agnostic.
            </p>
          </div>
          <div className="p-5">
            <h3 className="font-semibold text-gray-900 mb-1">What happens if a validation rule fails?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Each rule runs in isolation. If one rule encounters an error, it&apos;s reported in your results
              but all other rules continue to run normally. A broken rule will never prevent your import from completing.
            </p>
          </div>
          <div className="p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Can I create custom validation rules?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Yes. Rules are TypeScript classes that implement a standard interface. See the{' '}
              <Link href="/docs/rules#writing-rules" className="text-teal-600 hover:underline">Writing Custom Rules</Link>{' '}
              section in the Rules documentation for a complete guide with examples.
            </p>
          </div>
          <div className="p-5">
            <h3 className="font-semibold text-gray-900 mb-1">How do I invite team members?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Account admins can invite users from the{' '}
              <Link href="/admin/users" className="text-teal-600 hover:underline">Users</Link>{' '}
              page under Settings. Invited users receive an email with a link to set up their account.
              You can assign roles to control what each user can access.
            </p>
          </div>
          <div className="p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Can one person have multiple accounts?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Yes. The same email address can be associated with multiple accounts. Each account has its own
              subscription, data, and configuration. You can switch between accounts from the user menu in the
              top-right corner.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Help?</h2>
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
          <p className="text-gray-700">
            Can&apos;t find what you&apos;re looking for? Reach out to our support team at{' '}
            <a href="mailto:support@freshsegments.com" className="text-teal-600 hover:underline font-medium">
              support@freshsegments.com
            </a>{' '}
            and we&apos;ll get back to you as soon as possible.
          </p>
        </div>
      </section>
    </>
  );
}

export default function DocumentationPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#14b8a6', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // Logged-in users see the page within the admin layout
  if (isAuthenticated) {
    return (
      <AdminLayout>
        <DocumentationContent />
      </AdminLayout>
    );
  }

  // Pre-login: standalone page with nav and footer
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <FreshSegmentsLogo className="h-7" />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium"
                style={{ color: '#0B8377' }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                style={{ backgroundColor: '#0B8377' }}
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <DocumentationContent />
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <FreshSegmentsLogo className="h-6" dark />
            <div className="flex items-center gap-4 text-sm">
              <Link href="/documentation" className="hover:text-white transition-colors">
                Documentation
              </Link>
              <span className="text-gray-500">|</span>
              <Link href="/legal/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span className="text-gray-500">|</span>
              <Link href="/legal/terms" className="hover:text-white transition-colors">
                Terms of Use
              </Link>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} FreshSegments. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
