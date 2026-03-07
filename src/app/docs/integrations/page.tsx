'use client';

import Link from 'next/link';
import { DocsLayout } from '@/components/docs/DocsLayout';

export default function IntegrationsDocsPage() {
  return (
    <DocsLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integrations Guide</h1>
        <p className="text-gray-600 mt-1">
          Connect FreshSegments to HubSpot to sync properties and streamline your import workflow.
        </p>
      </div>

      <div className="space-y-10">
        {/* Overview */}
        <section id="overview" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Overview</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              FreshSegments integrates with HubSpot to automatically sync property labels into your
              account. This means your{' '}
              <Link href="/column-headings" className="text-teal-600 hover:underline">Output Headings</Link>{' '}
              stay in sync with HubSpot, and column mapping during import becomes much faster because
              the correct headings are already available.
            </p>
            <p>
              Integrations are managed on the{' '}
              <Link href="/admin/integrations" className="text-teal-600 hover:underline">Settings &rarr; Integrations</Link>{' '}
              page. Only administrators can connect or disconnect integrations.
            </p>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <p className="text-sm">
                <strong>Privacy note:</strong> We only read the <em>names</em> of your HubSpot properties
                (Contact, Company, and Deal fields). We never access, view, or store your actual records,
                contacts, or deal data.
              </p>
            </div>
          </div>
        </section>

        {/* Connecting HubSpot */}
        <section id="connecting" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Connecting HubSpot</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>To connect your HubSpot account:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Go to{' '}
                <Link href="/admin/integrations" className="text-teal-600 hover:underline">Settings &rarr; Integrations</Link>.
              </li>
              <li>
                Click the <strong>Connect</strong> button in the HubSpot section.
              </li>
              <li>
                A popup window opens with HubSpot&apos;s authorization screen. Select the HubSpot
                account you want to connect and approve the requested permissions.
              </li>
              <li>
                Once authorized, the popup closes and your integration status updates to
                &ldquo;Connected&rdquo; with your Hub ID displayed.
              </li>
              <li>
                Properties are synced automatically on first connection.
              </li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm">
                <strong>Note:</strong> HubSpot may show a two-screen consent process. Make sure to
                complete both screens &mdash; closing after the first screen will cancel the connection.
              </p>
            </div>
          </div>
        </section>

        {/* Permissions */}
        <section id="permissions" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Required Permissions</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              FreshSegments requests the minimum permissions needed to read property definitions:
            </p>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Scope</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">crm.schemas.contacts.read</code></td>
                  <td className="px-4 py-2 text-gray-600">Read Contact property names and labels</td>
                </tr>
                <tr>
                  <td className="px-4 py-2"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">crm.schemas.companies.read</code></td>
                  <td className="px-4 py-2 text-gray-600">Read Company property names and labels</td>
                </tr>
                <tr>
                  <td className="px-4 py-2"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">crm.schemas.deals.read</code></td>
                  <td className="px-4 py-2 text-gray-600">Read Deal property names and labels</td>
                </tr>
              </tbody>
            </table>
            <p>
              These are read-only schema permissions. FreshSegments cannot create, modify, or delete
              records in your HubSpot account through this integration.
            </p>
          </div>
        </section>

        {/* Property Sync */}
        <section id="property-sync" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Property Sync</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              When connected, FreshSegments pulls property metadata from three HubSpot object types:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Contacts</strong> &mdash; e.g., First Name, Last Name, Email, Phone, Company</li>
              <li><strong>Companies</strong> &mdash; e.g., Name, Domain, Industry, City, State</li>
              <li><strong>Deals</strong> &mdash; e.g., Deal Name, Deal Stage, Amount, Close Date</li>
            </ul>
            <p>
              For each property, the system stores the field name, label, type, and object type.
              These are then surfaced as{' '}
              <Link href="/column-headings" className="text-teal-600 hover:underline">Output Headings</Link>{' '}
              so your column mapping dropdown includes every HubSpot field.
            </p>
            <h3 className="font-semibold text-gray-900 mt-4">Re-syncing</h3>
            <p>
              Properties are synced automatically when you first connect. After that, use the{' '}
              <strong>Re-Sync</strong> button on either the Integrations page or the Output Headings
              page to pull the latest properties. You should re-sync after:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Adding new custom properties in HubSpot</li>
              <li>Renaming existing properties</li>
              <li>Removing properties you no longer need</li>
            </ul>
          </div>
        </section>

        {/* Account Scope */}
        <section id="account-scope" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Account Scope</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              The HubSpot integration is connected at the <strong>account level</strong>, not per-user.
              This means:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All users in your organization share the same HubSpot connection.</li>
              <li>Synced properties and output headings are available to everyone on the account.</li>
              <li>Only administrators can connect, disconnect, or re-sync the integration.</li>
            </ul>
            <p>
              If your organization has multiple FreshSegments accounts, each account manages its own
              HubSpot connection independently.
            </p>
          </div>
        </section>

        {/* Disconnecting */}
        <section id="disconnecting" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Disconnecting</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              To disconnect HubSpot, go to{' '}
              <Link href="/admin/integrations" className="text-teal-600 hover:underline">Settings &rarr; Integrations</Link>{' '}
              and click <strong>Disconnect</strong>. This will:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Revoke the OAuth tokens so FreshSegments can no longer access your HubSpot account.</li>
              <li>Uninstall the FreshSegments app from your HubSpot portal.</li>
              <li>Remove all HubSpot-synced output headings from your account.</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm">
                <strong>Note:</strong> Manual headings are not affected by disconnecting.
                Only headings sourced from HubSpot are removed.
              </p>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section id="troubleshooting" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Troubleshooting</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Issue</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Solution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2">Popup blocked during connection</td>
                  <td className="px-4 py-2 text-gray-600">Allow popups for the FreshSegments domain in your browser settings and try again.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Connection shows as disconnected after it was connected</td>
                  <td className="px-4 py-2 text-gray-600">The OAuth token may have expired. Click Connect again to re-authorize.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">New HubSpot properties not appearing</td>
                  <td className="px-4 py-2 text-gray-600">Click Re-Sync to pull the latest properties from HubSpot.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Connect button is disabled or missing</td>
                  <td className="px-4 py-2 text-gray-600">Only account administrators can manage integrations. Contact your admin.</td>
                </tr>
              </tbody>
            </table>
            <p>
              If you&apos;re still having issues, reach out via our{' '}
              <Link href="/contact" className="text-teal-600 hover:underline">contact form</Link>{' '}
              or email{' '}
              <a href="mailto:info@freshsegments.com" className="text-teal-600 hover:underline">
                info@freshsegments.com
              </a>.
            </p>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
