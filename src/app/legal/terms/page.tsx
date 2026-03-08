'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components/PublicLayout';

export default function TermsOfUsePage() {
  return (
    <PublicLayout maxWidth="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Terms of Use</h1>
        <p className="text-sm text-gray-500 mt-1">Last updated: February 2026</p>
      </div>

      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">1. Acceptance of Terms</h2>
          <p className="text-gray-700 mt-3">
            By accessing or using FreshSegments (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Use.
            If you do not agree to these terms, you may not use the Service. These terms apply to all users,
            including administrators, team members, and any person who accesses the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">2. Description of Service</h2>
          <p className="text-gray-700 mt-3">
            FreshSegments is a data validation and transformation tool designed to clean, normalize, and prepare
            spreadsheet data for import into CRM systems such as HubSpot. The Service provides:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
            <li>Client-side spreadsheet parsing and validation</li>
            <li>Configurable validation rules for data transformation</li>
            <li>Column mapping and output heading management</li>
            <li>Optional HubSpot integration for property syncing</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">3. User Accounts</h2>
          <p className="text-gray-700 mt-3">
            You are responsible for maintaining the confidentiality of your account credentials. You agree to
            notify us immediately of any unauthorized use of your account. You are responsible for all activity
            that occurs under your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">4. Acceptable Use</h2>
          <p className="text-gray-700 mt-3">You agree not to:</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
            <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
            <li>Attempt to gain unauthorized access to the Service, other accounts, or any related systems</li>
            <li>Upload files containing malicious code, viruses, or harmful content</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Use the Service to process data you do not have the right to use or share</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the Service, except as permitted by law</li>
            <li>Resell, sublicense, or redistribute access to the Service without authorization</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">5. Data Ownership</h2>
          <p className="text-gray-700 mt-3">
            You retain full ownership of all data you upload to or process through the Service. We do not claim
            any ownership rights over your spreadsheet data, import configurations, or exported results.
          </p>
          <p className="text-gray-700 mt-2">
            Spreadsheet data is processed entirely in your browser and is never transmitted to or stored on our
            servers. See our <Link href="/legal/privacy" className="text-teal-600 hover:underline">Privacy Policy</Link> for
            complete details on data handling.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">6. Validation Rules</h2>
          <p className="text-gray-700 mt-3">
            The Service provides validation and transformation rules that modify your data during import processing.
            While we strive for accuracy, these rules are provided as tools to assist your workflow. You are
            responsible for reviewing the validation results and verifying that transformations are correct before
            using the exported data.
          </p>
          <p className="text-gray-700 mt-2">
            We are not liable for any data loss, corruption, or errors resulting from the application of
            validation rules to your data. Always review the changes summary before proceeding with an export.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">7. Third-Party Integrations</h2>
          <p className="text-gray-700 mt-3">
            The Service may integrate with third-party platforms such as HubSpot. Your use of these integrations
            is subject to the respective third party&apos;s terms of service. We are not responsible for the
            availability, accuracy, or actions of third-party services.
          </p>
          <p className="text-gray-700 mt-2">
            When you connect a HubSpot account, we store encrypted OAuth tokens to maintain the connection.
            You may disconnect your HubSpot account at any time from the Integrations settings page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">8. Service Availability</h2>
          <p className="text-gray-700 mt-3">
            We strive to maintain high availability but do not guarantee uninterrupted access to the Service.
            We may perform maintenance, updates, or modifications that temporarily affect availability. We will
            make reasonable efforts to provide advance notice of planned downtime.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">9. Limitation of Liability</h2>
          <p className="text-gray-700 mt-3">
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
            LOSS OF DATA, REVENUE, OR PROFITS, ARISING FROM YOUR USE OF THE SERVICE.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">10. Changes to Terms</h2>
          <p className="text-gray-700 mt-3">
            We reserve the right to modify these terms at any time. We will notify users of material changes
            through the Service. Your continued use of the Service after changes are posted constitutes acceptance
            of the revised terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">11. Termination</h2>
          <p className="text-gray-700 mt-3">
            We may suspend or terminate your access to the Service at any time for violation of these terms or
            for any other reason at our discretion. Upon termination, your right to use the Service ceases
            immediately. Any configuration data associated with your account may be deleted.
          </p>
        </section>

        <div className="border-t border-gray-200 pt-4 mt-8">
          <p className="text-sm text-gray-500">
            See also: <Link href="/legal/privacy" className="text-teal-600 hover:underline">Privacy Policy</Link>
            {' | '}
            <Link href="/documentation" className="text-teal-600 hover:underline">Documentation</Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
