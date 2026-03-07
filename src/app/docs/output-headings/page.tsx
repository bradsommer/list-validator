'use client';

import Link from 'next/link';
import { DocsLayout } from '@/components/docs/DocsLayout';

export default function OutputHeadingsDocsPage() {
  return (
    <DocsLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Output Headings Guide</h1>
        <p className="text-gray-600 mt-1">
          Configure the column headings used when exporting cleaned data for HubSpot import.
        </p>
      </div>

      <div className="space-y-10">
        {/* Overview */}
        <section id="overview" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Overview</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              Output headings define the column names available in the mapping step of an import.
              When you upload a spreadsheet, you map each of your columns to one of these headings
              so the exported CSV matches HubSpot&apos;s expected property names.
            </p>
            <p>
              Headings can be added manually or synced automatically from your HubSpot account.
              They are managed on the{' '}
              <Link href="/column-headings" className="text-teal-600 hover:underline">Output Headings</Link> page.
            </p>
          </div>
        </section>

        {/* Manual Headings */}
        <section id="manual-headings" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Adding Manual Headings</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              To add a heading manually, type the name in the input field at the top of the
              Output Headings page and click <strong>Add</strong>. The heading is saved immediately
              and will appear as a mapping option during your next import.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Heading names must be unique (case-insensitive).</li>
              <li>Manual headings are labeled with a <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Manual</span> badge.</li>
              <li>You can edit or remove manual headings at any time.</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm">
                <strong>Tip:</strong> Name headings to match your HubSpot property labels exactly.
                This makes it easy to import the CSV directly into HubSpot without further mapping.
              </p>
            </div>
          </div>
        </section>

        {/* HubSpot Sync */}
        <section id="hubspot-sync" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">HubSpot Sync</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              If you have connected your HubSpot account via{' '}
              <Link href="/admin/integrations" className="text-teal-600 hover:underline">Integrations</Link>,
              you can sync property labels directly from HubSpot. This pulls in the human-readable
              labels for all Contact, Company, and Deal properties and adds them as output headings.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Synced headings are labeled with a <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">HubSpot</span> badge
                and show their object type (Contact, Company, or Deal).
              </li>
              <li>
                Click the <strong>Re-Sync</strong> button to refresh headings if you have added or
                renamed properties in HubSpot.
              </li>
              <li>
                Synced headings persist even if the HubSpot connection is temporarily unavailable.
              </li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm">
                <strong>Note:</strong> We only sync property <em>names</em> from HubSpot. Your actual
                Contact, Company, and Deal records are never accessed or stored.
              </p>
            </div>
          </div>
        </section>

        {/* Column Mapping */}
        <section id="column-mapping" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">How Column Mapping Works</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              During import, FreshSegments automatically matches your spreadsheet columns to output
              headings using smart matching. The matching priority is:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>Exact match</strong> &mdash; Your column header matches an output heading exactly
                (case-insensitive).
              </li>
              <li>
                <strong>Known field detection</strong> &mdash; Common field names like &ldquo;Email&rdquo;,
                &ldquo;First Name&rdquo;, and &ldquo;Phone&rdquo; are automatically recognized regardless
                of the heading name.
              </li>
              <li>
                <strong>Pattern matching</strong> &mdash; Fuzzy matching handles variations like
                &ldquo;State/Province&rdquo; mapping to &ldquo;State&rdquo;, or &ldquo;Company Name&rdquo;
                mapping to &ldquo;Company&rdquo;.
              </li>
            </ol>
            <p>
              You can always override the automatic match by selecting a different heading from the
              dropdown during the mapping step.
            </p>
          </div>
        </section>

        {/* Sorting & Filtering */}
        <section id="sorting" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Sorting &amp; Managing Headings</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              The Output Headings table can be sorted by clicking any column header:
            </p>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Column</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2 font-medium">Output Heading</td>
                  <td className="px-4 py-2 text-gray-600">The heading name used in the exported CSV.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Object</td>
                  <td className="px-4 py-2 text-gray-600">The HubSpot object type (Contact, Company, Deal) for synced headings.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Source</td>
                  <td className="px-4 py-2 text-gray-600">Whether the heading was added manually or synced from HubSpot.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Added</td>
                  <td className="px-4 py-2 text-gray-600">The date the heading was created.</td>
                </tr>
              </tbody>
            </table>
            <p>
              Click a column header once to sort ascending, and again to sort descending.
            </p>
          </div>
        </section>

        {/* Best Practices */}
        <section id="best-practices" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Best Practices</h2>
          <div className="text-gray-700 leading-relaxed">
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Connect HubSpot first.</strong> Syncing properties pulls in all available
                headings automatically, saving you from adding them one by one.
              </li>
              <li>
                <strong>Use manual headings for custom columns.</strong> If you need output columns
                that don&apos;t correspond to a HubSpot property (like import question answers or
                internal tracking fields), add them manually.
              </li>
              <li>
                <strong>Re-sync after property changes.</strong> If you add, rename, or remove
                properties in HubSpot, click Re-Sync to keep your headings up to date.
              </li>
              <li>
                <strong>Remove unused headings.</strong> A cleaner list of headings makes column
                mapping faster and reduces the chance of mismatches during import.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
