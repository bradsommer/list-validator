'use client';

import Link from 'next/link';
import { DocsLayout } from '@/components/docs/DocsLayout';

export default function ImportQuestionsDocsPage() {
  return (
    <DocsLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Questions Guide</h1>
        <p className="text-gray-600 mt-1">
          Collect context from users during import and add the answers as columns in the exported data.
        </p>
      </div>

      <div className="space-y-10">
        {/* Overview */}
        <section id="overview" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Overview</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              Import Questions let you ask users context-specific questions before validation runs.
              Each answer is written into a new column on every row of the exported file, making it
              easy to tag, categorize, or enrich data during the import workflow.
            </p>
            <p>
              For example, you might ask <em>&ldquo;Is this a B2B or B2C list?&rdquo;</em> and the
              answer gets added as a column so HubSpot can use it for segmentation.
            </p>
            <p>
              Questions are configured by admins on the{' '}
              <Link href="/import-questions" className="text-teal-600 hover:underline">Import Questions</Link>{' '}
              page and are presented to all users during the import flow.
            </p>
          </div>
        </section>

        {/* Question Types */}
        <section id="question-types" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Question Types</h2>
          <div className="text-gray-700 leading-relaxed space-y-4">
            <p>Five question types are available. Choose the type that best fits the kind of answer you need.</p>
            <div className="grid gap-3">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Free Text</span>
                </div>
                <p className="text-sm text-gray-600">
                  An open text field where the user can type any value. Use this when answers are unpredictable
                  or unique to each import, such as a campaign name or source description.
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Dropdown</span>
                </div>
                <p className="text-sm text-gray-600">
                  A single-select dropdown menu. Best for questions with a defined set of options where
                  you want to ensure consistency, such as region or department.
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">Checkbox</span>
                </div>
                <p className="text-sm text-gray-600">
                  A simple Yes/No toggle. Use for binary decisions like &ldquo;Will you want to sync these
                  contacts to Dynamics?&rdquo; The output value is either &ldquo;Yes&rdquo; or &ldquo;No&rdquo;.
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Radio Select</span>
                </div>
                <p className="text-sm text-gray-600">
                  Radio buttons for single-choice selection. Similar to a dropdown but all options are
                  visible at once. Good for 2&ndash;5 mutually exclusive choices.
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">Multiple Select</span>
                </div>
                <p className="text-sm text-gray-600">
                  Checkboxes that allow multiple selections. Selected values are joined with commas in the
                  output column. Use when more than one option can apply, such as selecting multiple tags.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Creating a Question */}
        <section id="creating-questions" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Creating a Question</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              Navigate to{' '}
              <Link href="/import-questions" className="text-teal-600 hover:underline">Import Questions</Link>{' '}
              and click <strong>Add Question</strong>. Each question requires:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Question Text</strong> &mdash; The question shown to the user during import
                (e.g., &ldquo;Is this a B2B or B2C list?&rdquo;).
              </li>
              <li>
                <strong>Column Header</strong> &mdash; The name of the column that will be added to the exported
                data (e.g., &ldquo;B2B or B2C&rdquo;). This becomes a real column in your CSV output.
              </li>
              <li>
                <strong>Question Type</strong> &mdash; Choose from free text, dropdown, checkbox, radio, or
                multiple select.
              </li>
            </ul>
          </div>
        </section>

        {/* Options & Output Values */}
        <section id="options" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Options &amp; Output Values</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              For dropdown, radio, and multiple-select types you define the available options.
              Each option has two parts:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Option label</strong> &mdash; What the user sees during import.
              </li>
              <li>
                <strong>Output value</strong> &mdash; What gets written into the data column. If left blank,
                the option label is used as the output value.
              </li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm">
                <strong>Example:</strong> You might show the user &ldquo;Business to Business&rdquo;
                as the label but write &ldquo;B2B&rdquo; as the output value. This keeps the import
                UI friendly while ensuring data consistency in HubSpot.
              </p>
            </div>
          </div>
        </section>

        {/* Configuration */}
        <section id="configuration" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Additional Configuration</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Setting</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2 font-medium">Required</td>
                  <td className="px-4 py-2 text-gray-600">
                    When enabled, the user must answer the question before they can continue the import.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Object Types</td>
                  <td className="px-4 py-2 text-gray-600">
                    Limit the question to specific HubSpot object types (Contacts, Companies, or Deals).
                    Leave all unchecked to show the question for every import.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Display Order</td>
                  <td className="px-4 py-2 text-gray-600">
                    Controls the order questions appear. Lower numbers display first. You can also
                    drag-and-drop questions on the list page to reorder them.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Enabled</td>
                  <td className="px-4 py-2 text-gray-600">
                    Toggle a question on or off without deleting it. Disabled questions are hidden
                    during import but preserved for future use.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* How Answers Are Applied */}
        <section id="how-answers-work" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">How Answers Are Applied</h2>
          <div className="text-gray-700 leading-relaxed space-y-3">
            <p>
              When a user answers an import question, the answer is applied as a <strong>new column</strong> on
              every row in the dataset. The column name matches the <em>Column Header</em> you configured.
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>User uploads a spreadsheet and maps columns.</li>
              <li>Enabled questions are presented during the import flow.</li>
              <li>The user provides answers to each question.</li>
              <li>Each answer becomes a new column added to all rows.</li>
              <li>Validation rules run on the data (including the new columns).</li>
              <li>The exported CSV includes the answer columns.</li>
            </ol>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm">
                <strong>Tip:</strong> Answers are session-only and are not stored in the database.
                They exist only in browser memory for the duration of the import.
              </p>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section id="best-practices" className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Best Practices</h2>
          <div className="text-gray-700 leading-relaxed">
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Use clear, concise question text.</strong> The user may not have context about why
                the question is being asked. Include enough detail so they can answer confidently.
              </li>
              <li>
                <strong>Match column headers to HubSpot properties.</strong> If the answer column needs to
                map to a specific HubSpot property, name the column header to match (or add it to your{' '}
                <Link href="/column-headings" className="text-teal-600 hover:underline">Output Headings</Link>).
              </li>
              <li>
                <strong>Use output values for data consistency.</strong> Display friendly labels to users
                but write standardized values (like codes or abbreviations) into the data.
              </li>
              <li>
                <strong>Only mark questions as required when necessary.</strong> Required questions
                block the import until answered, so use sparingly.
              </li>
              <li>
                <strong>Scope questions with object types.</strong> If a question only applies to Contact
                imports, set the object type so it does not appear during Company or Deal imports.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
