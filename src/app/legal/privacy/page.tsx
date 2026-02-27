'use client';

import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function PrivacyPolicyPage() {
  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: February 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">1. Overview</h2>
            <p className="text-gray-700 mt-3">
              List Validator (&ldquo;the Service&rdquo;) is committed to protecting your privacy. This Privacy Policy
              explains what information we collect, how we use it, and the measures we take to keep it safe. By using
              the Service, you consent to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">2. Spreadsheet Data — Client-Side Only</h2>
            <p className="text-gray-700 mt-3">
              Your spreadsheet data is processed entirely within your web browser. When you upload a file for
              validation:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
              <li>The file is parsed and validated using client-side JavaScript — it is <strong>never uploaded to our servers</strong></li>
              <li>All validation rules, transformations, and exports run locally in your browser</li>
              <li>No spreadsheet content is transmitted over the network at any point during processing</li>
              <li>When you close or navigate away from the page, all spreadsheet data is discarded from browser memory</li>
            </ul>
            <p className="text-gray-700 mt-2">
              We have no ability to access, read, or recover your spreadsheet data because it never leaves your device.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">3. Information We Collect</h2>
            <p className="text-gray-700 mt-3">We collect the following types of information:</p>
            <h3 className="text-base font-medium text-gray-800 mt-4">Account Information</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
              <li>Email address (used for authentication and account identification)</li>
              <li>Name (if provided during registration)</li>
              <li>Account role and team membership</li>
            </ul>
            <h3 className="text-base font-medium text-gray-800 mt-4">Configuration Data</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
              <li>Validation rule configurations (enabled/disabled status, target fields, display preferences)</li>
              <li>Column heading mappings and output heading definitions</li>
              <li>Import question configurations</li>
              <li>HubSpot integration settings (encrypted OAuth tokens, connected account info)</li>
            </ul>
            <h3 className="text-base font-medium text-gray-800 mt-4">Usage Data</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
              <li>Authentication events (login timestamps)</li>
              <li>General feature usage for improving the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">4. How We Use Your Information</h2>
            <p className="text-gray-700 mt-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
              <li>Authenticate you and provide access to your account</li>
              <li>Store your validation rule preferences so they persist between sessions</li>
              <li>Maintain your column heading and output heading configurations</li>
              <li>Facilitate HubSpot integration (syncing properties, maintaining OAuth connections)</li>
              <li>Improve the Service and fix issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">5. Data Storage and Security</h2>
            <p className="text-gray-700 mt-3">
              Account and configuration data is stored in a secure database hosted by Supabase with the following
              protections:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
              <li>All data is encrypted in transit (TLS/HTTPS)</li>
              <li>Database access is restricted through Row Level Security (RLS) policies</li>
              <li>HubSpot OAuth tokens are stored encrypted</li>
              <li>Authentication is managed through secure session tokens</li>
            </ul>
            <p className="text-gray-700 mt-2">
              We do not store passwords directly — authentication is handled through Supabase Auth, which uses
              industry-standard security practices including bcrypt hashing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">6. Third-Party Services</h2>
            <p className="text-gray-700 mt-3">The Service integrates with the following third-party services:</p>
            <h3 className="text-base font-medium text-gray-800 mt-4">Supabase</h3>
            <p className="text-gray-700 mt-1">
              Used for authentication and configuration data storage. Subject to the{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                Supabase Privacy Policy
              </a>.
            </p>
            <h3 className="text-base font-medium text-gray-800 mt-4">HubSpot (Optional)</h3>
            <p className="text-gray-700 mt-1">
              If you choose to connect your HubSpot account, we use the HubSpot API to sync property definitions.
              We store encrypted OAuth tokens to maintain the connection. You may disconnect at any time from the
              Integrations settings page. Subject to the{' '}
              <a href="https://legal.hubspot.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                HubSpot Privacy Policy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">7. Data Retention</h2>
            <p className="text-gray-700 mt-3">
              Account and configuration data is retained for as long as your account is active. If you request
              account deletion, we will remove all associated data including:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
              <li>Account credentials and profile information</li>
              <li>Validation rule configurations</li>
              <li>Column heading and output heading mappings</li>
              <li>HubSpot integration tokens and settings</li>
            </ul>
            <p className="text-gray-700 mt-2">
              Spreadsheet data is never stored, so there is nothing to retain or delete regarding your file contents.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">8. Cookies and Local Storage</h2>
            <p className="text-gray-700 mt-3">
              The Service uses cookies and browser local storage for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
              <li><strong>Authentication cookies:</strong> Secure session tokens to keep you logged in</li>
              <li><strong>Local storage:</strong> Temporary caching of application state during your session</li>
            </ul>
            <p className="text-gray-700 mt-2">
              We do not use tracking cookies or third-party analytics cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">9. Your Rights</h2>
            <p className="text-gray-700 mt-3">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
              <li><strong>Access</strong> the personal information we hold about you</li>
              <li><strong>Correct</strong> inaccurate information in your account</li>
              <li><strong>Delete</strong> your account and all associated data</li>
              <li><strong>Disconnect</strong> third-party integrations (such as HubSpot) at any time</li>
              <li><strong>Export</strong> your configuration data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">10. Children&apos;s Privacy</h2>
            <p className="text-gray-700 mt-3">
              The Service is not intended for use by individuals under the age of 16. We do not knowingly collect
              personal information from children. If you believe a child has provided us with personal information,
              please contact us so we can take appropriate action.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">11. Changes to This Policy</h2>
            <p className="text-gray-700 mt-3">
              We may update this Privacy Policy from time to time. We will notify users of material changes through
              the Service. Your continued use of the Service after changes are posted constitutes acceptance of the
              updated policy.
            </p>
          </section>

          <div className="border-t border-gray-200 pt-4 mt-8">
            <p className="text-sm text-gray-500">
              See also: <Link href="/legal/terms" className="text-primary-600 hover:underline">Terms of Use</Link>
              {' | '}
              <Link href="/docs/rules" className="text-primary-600 hover:underline">Rules Documentation</Link>
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
