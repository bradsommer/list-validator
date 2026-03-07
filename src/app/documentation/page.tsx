'use client';

import Link from 'next/link';
import { DocsLayout } from '@/components/docs/DocsLayout';

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
    title: 'Import Questions Guide',
    description: 'Collect context from users during import and add answers as columns in the exported data. Covers question types, options, and output values.',
    href: '/docs/import-questions',
    icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'Output Headings Guide',
    description: 'Configure the column headings used when exporting cleaned data for HubSpot import. Includes manual headings and HubSpot property sync.',
    href: '/docs/output-headings',
    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  },
  {
    title: 'Integrations Guide',
    description: 'Connect FreshSegments to HubSpot to sync properties and streamline your import workflow. Covers setup, permissions, and troubleshooting.',
    href: '/docs/integrations',
    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
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

export default function DocumentationPage() {
  return (
    <DocsLayout>
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

      {/* Guides */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Guides</h2>
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
            Can&apos;t find what you&apos;re looking for? Email us at{' '}
            <a href="mailto:info@freshsegments.com" className="text-teal-600 hover:underline font-medium">
              info@freshsegments.com
            </a>{' '}
            or use our{' '}
            <Link href="/contact" className="text-teal-600 hover:underline font-medium">
              contact form
            </Link>{' '}
            and we&apos;ll get back to you as soon as possible.
          </p>
        </div>
      </section>
    </DocsLayout>
  );
}
