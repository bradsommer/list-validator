'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import Link from 'next/link';

interface DocSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = children;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden my-4">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
        title="Copy code"
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
      <pre className="p-4 pr-12 text-sm text-green-400 font-mono whitespace-pre overflow-x-auto">
        {children}
      </pre>
    </div>
  );
}

const sections: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <div className="space-y-3">
        <p>
          Validation rules are TypeScript scripts that clean, normalize, and validate your imported data.
          Each rule targets specific columns in your spreadsheet and runs automatically during the import
          validation step.
        </p>
        <p>
          Rules come in two types:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Transform</strong> &mdash; Modifies data (e.g., converting state abbreviations to full names, formatting phone numbers)</li>
          <li><strong>Validate</strong> &mdash; Checks data for errors without modifying it (e.g., detecting invalid emails, finding duplicates)</li>
        </ul>
        <p>
          You can enable/disable rules, edit their target fields, and assign them to specific object types
          from the <Link href="/rules" className="text-primary-600 hover:underline">Rules page</Link>.
        </p>
      </div>
    ),
  },
  {
    id: 'target-fields',
    title: 'Dynamic Target Fields',
    content: (
      <div className="space-y-3">
        <p>
          Every rule has a <strong>Target Fields</strong> setting that controls which column(s) in your
          spreadsheet the rule operates on. When you change this value in the Rules UI, the script
          dynamically uses your configured value instead of its default.
        </p>

        <h4 className="font-medium text-gray-900 mt-4">How it works</h4>
        <p>
          When a rule runs, it calls <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">findColumnHeader(targetField, ...)</code> to
          locate the matching column in your spreadsheet. The lookup follows this priority:
        </p>
        <ol className="list-decimal pl-6 space-y-1">
          <li><strong>Auto-detected matches</strong> &mdash; columns that were automatically identified during upload</li>
          <li><strong>Direct column name</strong> &mdash; exact or case-insensitive match against your spreadsheet&apos;s column headers</li>
          <li><strong>Pattern matching</strong> &mdash; fuzzy lookup using known aliases (e.g., &ldquo;state&rdquo; matches &ldquo;State/Province&rdquo;, &ldquo;State Region&rdquo;, etc.)</li>
        </ol>

        <h4 className="font-medium text-gray-900 mt-4">Examples</h4>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm"><strong>Default value:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-sm">state</code></p>
          <p className="text-sm">Matches columns named &ldquo;State&rdquo;, &ldquo;State/Province&rdquo;, &ldquo;State Region&rdquo;, &ldquo;Province&rdquo;, etc.</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 mt-2">
          <p className="text-sm"><strong>Custom value:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-sm">Address 1: State/Province</code></p>
          <p className="text-sm">Matches a column with that exact name in your spreadsheet (useful when your file has a non-standard header).</p>
        </div>

        <h4 className="font-medium text-gray-900 mt-4">Multi-field rules</h4>
        <p>
          Some rules operate on multiple fields. For example, <strong>Name Capitalization</strong> targets
          both <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">firstname</code> and <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">lastname</code>.
          Enter multiple values separated by commas:
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm"><strong>Target Fields:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-sm">First Name, Last Name</code></p>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          The order matters &mdash; the first value maps to the first field the script uses, the second to the second field, and so on.
        </p>
      </div>
    ),
  },
  {
    id: 'state-normalization',
    title: 'Example: State Normalization',
    content: (
      <div className="space-y-3">
        <p>
          Converts US state abbreviations to full names and fixes common misspellings.
        </p>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Input</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Output</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2">CA</td><td className="px-4 py-2">California</td><td className="px-4 py-2 text-gray-500">Abbreviation expanded</td></tr>
            <tr><td className="px-4 py-2">NY</td><td className="px-4 py-2">New York</td><td className="px-4 py-2 text-gray-500">Abbreviation expanded</td></tr>
            <tr><td className="px-4 py-2">Califronia</td><td className="px-4 py-2">California</td><td className="px-4 py-2 text-gray-500">Misspelling corrected</td></tr>
            <tr><td className="px-4 py-2">texas</td><td className="px-4 py-2">Texas</td><td className="px-4 py-2 text-gray-500">Case normalized</td></tr>
            <tr><td className="px-4 py-2">California</td><td className="px-4 py-2">California</td><td className="px-4 py-2 text-gray-500">Already correct &mdash; no change</td></tr>
          </tbody>
        </table>
        <p className="text-sm text-gray-600">
          <strong>Default target field:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded">state</code><br />
          Change this if your spreadsheet uses a different column name, e.g. <code className="bg-gray-100 px-1.5 py-0.5 rounded">State/Province</code> or <code className="bg-gray-100 px-1.5 py-0.5 rounded">Region</code>.
        </p>
      </div>
    ),
  },
  {
    id: 'date-normalization',
    title: 'Example: Date Standardization',
    content: (
      <div className="space-y-3">
        <p>
          Detects various date formats and normalizes them to a consistent format for HubSpot import.
        </p>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Input</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Output</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Format Detected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2">01/15/2024</td><td className="px-4 py-2">2024-01-15</td><td className="px-4 py-2 text-gray-500">MM/DD/YYYY</td></tr>
            <tr><td className="px-4 py-2">15-01-2024</td><td className="px-4 py-2">2024-01-15</td><td className="px-4 py-2 text-gray-500">DD-MM-YYYY</td></tr>
            <tr><td className="px-4 py-2">January 15, 2024</td><td className="px-4 py-2">2024-01-15</td><td className="px-4 py-2 text-gray-500">Long date</td></tr>
            <tr><td className="px-4 py-2">2024-01-15</td><td className="px-4 py-2">2024-01-15</td><td className="px-4 py-2 text-gray-500">Already ISO &mdash; no change</td></tr>
          </tbody>
        </table>
        <p className="text-sm text-gray-600">
          <strong>Default target field:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded">date</code><br />
          This matches columns like &ldquo;Date&rdquo;, &ldquo;Close Date&rdquo;, &ldquo;Start Date&rdquo;, &ldquo;Birthday&rdquo;, etc.
          If your spreadsheet has a specific date column like <code className="bg-gray-100 px-1.5 py-0.5 rounded">Contract Start</code>, set that as the target field.
        </p>
      </div>
    ),
  },
  {
    id: 'email-validation',
    title: 'Example: Email Validation',
    content: (
      <div className="space-y-3">
        <p>
          Validates email addresses for proper formatting and flags invalid entries as errors.
        </p>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Input</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2">john@example.com</td><td className="px-4 py-2 text-green-600">Valid</td></tr>
            <tr><td className="px-4 py-2">john@example</td><td className="px-4 py-2 text-red-600">Error &mdash; missing TLD</td></tr>
            <tr><td className="px-4 py-2">not-an-email</td><td className="px-4 py-2 text-red-600">Error &mdash; invalid format</td></tr>
            <tr><td className="px-4 py-2">(empty)</td><td className="px-4 py-2 text-yellow-600">Warning &mdash; missing value</td></tr>
          </tbody>
        </table>
        <p className="text-sm text-gray-600">
          <strong>Default target field:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded">email</code>
        </p>
      </div>
    ),
  },
  {
    id: 'phone-normalization',
    title: 'Example: Phone Normalization',
    content: (
      <div className="space-y-3">
        <p>
          Strips formatting characters and normalizes phone numbers to a consistent format.
        </p>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Input</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2">(555) 123-4567</td><td className="px-4 py-2">+15551234567</td></tr>
            <tr><td className="px-4 py-2">555.123.4567</td><td className="px-4 py-2">+15551234567</td></tr>
            <tr><td className="px-4 py-2">1-555-123-4567</td><td className="px-4 py-2">+15551234567</td></tr>
          </tbody>
        </table>
        <p className="text-sm text-gray-600">
          <strong>Default target field:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded">phone</code><br />
          Matches &ldquo;Phone&rdquo;, &ldquo;Phone Number&rdquo;, &ldquo;Mobile&rdquo;, &ldquo;Cell Phone&rdquo;, etc.
        </p>
      </div>
    ),
  },
  {
    id: 'name-capitalization',
    title: 'Example: Name Capitalization',
    content: (
      <div className="space-y-3">
        <p>
          Properly capitalizes first and last names, handling edge cases like hyphenated names, prefixes, and suffixes.
        </p>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Input</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-4 py-2">john</td><td className="px-4 py-2">John</td></tr>
            <tr><td className="px-4 py-2">SMITH</td><td className="px-4 py-2">Smith</td></tr>
            <tr><td className="px-4 py-2">mary-jane</td><td className="px-4 py-2">Mary-Jane</td></tr>
            <tr><td className="px-4 py-2">mcdonald</td><td className="px-4 py-2">McDonald</td></tr>
          </tbody>
        </table>
        <p className="text-sm text-gray-600">
          <strong>Default target fields:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded">firstname, lastname</code><br />
          This is a multi-field rule. The first value targets the first name column, the second targets the last name column.
        </p>
      </div>
    ),
  },
  {
    id: 'object-types',
    title: 'Object Types',
    content: (
      <div className="space-y-3">
        <p>
          You can assign rules to specific HubSpot object types: <strong>Contacts</strong>, <strong>Companies</strong>, or <strong>Deals</strong>.
          This is useful when a rule only makes sense for certain record types.
        </p>
        <p>
          For example, you might want email validation to only run on Contact imports, not Company or Deal imports.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm">
            <strong>Tip:</strong> If you leave all object types unchecked, the rule applies to all imports regardless of the selected object type.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'writing-rules',
    title: 'Writing Custom Rules',
    content: (
      <div className="space-y-3">
        <p>
          Each rule is a TypeScript class that implements the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">IValidationScript</code> interface.
          Here&apos;s the basic structure:
        </p>
        <CodeBlock>{`import type { IValidationScript, ScriptContext, ScriptExecutionResult } from './types';
import type { ParsedRow } from '@/types';
import { findColumnHeader } from './findColumn';

export class MyCustomRule implements IValidationScript {
  id = 'my-custom-rule';
  name = 'My Custom Rule';
  description = 'What this rule does';
  type: 'transform' = 'transform';  // or 'validate'
  targetFields = ['field_name'];
  order = 50;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes = [];
    const modifiedRows = [];

    // Use context.targetFields for dynamic target field support
    const targetField = context.targetFields?.[0] || 'field_name';
    const header = findColumnHeader(targetField, headerMatches, rows);

    if (!header) {
      // Column not found, return rows unchanged
      return { success: true, changes: [], errors: [], warnings: [], modifiedRows: [...rows] };
    }

    rows.forEach((row, index) => {
      const newRow = { ...row };
      const value = row[header];

      if (value) {
        // Your transformation logic here
        const newValue = String(value).trim();

        if (newValue !== String(value)) {
          newRow[header] = newValue;
          changes.push({
            rowIndex: index,
            field: targetField,
            originalValue: value,
            newValue,
            reason: 'Trimmed whitespace',
          });
        }
      }

      modifiedRows.push(newRow);
    });

    return { success: true, changes, errors: [], warnings: [], modifiedRows };
  }
}`}</CodeBlock>

        <h4 className="font-medium text-gray-900 mt-4">Key points</h4>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>
            <strong>Always use <code className="bg-gray-100 px-1 rounded">context.targetFields</code></strong> instead of hardcoding field names.
            This makes your rule configurable from the UI:
            <CodeBlock>{`// Dynamic target field (recommended)
const targetField = context.targetFields?.[0] || 'state';
const header = findColumnHeader(targetField, headerMatches, rows);

// NOT this (hardcoded, not configurable)
const header = findColumnHeader('state', headerMatches, rows);`}</CodeBlock>
          </li>
          <li>
            <strong><code className="bg-gray-100 px-1 rounded">findColumnHeader</code></strong> handles fuzzy column matching for you.
            It checks auto-detected matches, then exact column names, then known patterns.
          </li>
          <li>
            <strong>Return all rows</strong> from <code className="bg-gray-100 px-1 rounded">modifiedRows</code>, even unchanged ones. The runner
            passes them to the next script in the chain.
          </li>
          <li>
            <strong>Transform vs Validate:</strong> Transform rules modify <code className="bg-gray-100 px-1 rounded">modifiedRows</code> and
            report <code className="bg-gray-100 px-1 rounded">changes</code>. Validate rules leave rows unchanged and report
            <code className="bg-gray-100 px-1 rounded">errors</code> and <code className="bg-gray-100 px-1 rounded">warnings</code>.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'execution-order',
    title: 'Execution Order',
    content: (
      <div className="space-y-3">
        <p>
          Rules execute in the order defined by their <strong>Order</strong> value (lowest first).
          Transform rules typically run before validation rules so that data is cleaned before being checked.
        </p>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Order</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Phase</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Example Rules</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-4 py-2">1&ndash;20</td>
              <td className="px-4 py-2"><span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Transform</span></td>
              <td className="px-4 py-2 text-gray-600">Whitespace cleanup, name capitalization, state normalization</td>
            </tr>
            <tr>
              <td className="px-4 py-2">20&ndash;40</td>
              <td className="px-4 py-2"><span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Transform</span></td>
              <td className="px-4 py-2 text-gray-600">Phone normalization, date standardization, company cleanup</td>
            </tr>
            <tr>
              <td className="px-4 py-2">40&ndash;60</td>
              <td className="px-4 py-2"><span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">Validate</span></td>
              <td className="px-4 py-2 text-gray-600">Email validation, required field checks</td>
            </tr>
            <tr>
              <td className="px-4 py-2">60+</td>
              <td className="px-4 py-2"><span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">Validate</span></td>
              <td className="px-4 py-2 text-gray-600">Duplicate detection (runs last, on cleaned data)</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-gray-500">
          Each rule receives the output of the previous rule, so transforms applied early in the chain
          benefit later validation rules.
        </p>
      </div>
    ),
  },
  {
    id: 'error-handling',
    title: 'Error Handling & Isolation',
    content: (
      <div className="space-y-3">
        <p>
          Each script runs inside an isolated try/catch boundary. If a script throws an error or crashes,
          the remaining scripts <strong>continue to run</strong> on the last known good data.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>A failing script is reported as an error in the validation results with the script name and error message.</li>
          <li>The next script in the chain receives the same rows the failed script received &mdash; no data is lost.</li>
          <li>All other scripts run to completion regardless of individual failures.</li>
        </ul>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
          <p className="text-sm">
            <strong>Bottom line:</strong> A broken rule will never prevent your import from completing.
            You&apos;ll see the error in the validation results and can fix the rule separately.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    content: (
      <div className="space-y-3">
        <p>
          Validation scripts are <strong>pre-compiled TypeScript classes</strong> that run in your browser.
          They are bundled at build time and cannot be modified at runtime. This architecture provides
          several security guarantees:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>No dynamic code execution.</strong> Scripts do not use <code className="bg-gray-100 px-1 rounded text-sm">eval()</code>,{' '}
            <code className="bg-gray-100 px-1 rounded text-sm">new Function()</code>, or any form of dynamic code evaluation.
            All script logic is statically compiled.
          </li>
          <li>
            <strong>No network access.</strong> Scripts receive only a <code className="bg-gray-100 px-1 rounded text-sm">ScriptContext</code> object
            containing row data and header information. They cannot make HTTP requests, access APIs, or communicate with external servers.
          </li>
          <li>
            <strong>No DOM access.</strong> Scripts operate purely on data objects. They cannot access the document,
            cookies, localStorage, or any browser APIs.
          </li>
          <li>
            <strong>Sandboxed input/output.</strong> Scripts receive an array of rows and return a modified array.
            They cannot access other users&apos; data, modify application state, or affect other scripts beyond
            the row data they return.
          </li>
          <li>
            <strong>Configuration only.</strong> The Rules UI lets you toggle rules on/off, change target fields,
            and assign object types. It does not allow injecting or modifying the actual script logic.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'data-handling',
    title: 'Data Handling & Storage',
    content: (
      <div className="space-y-3">
        <p>
          Understanding how your data flows through the application is important. Here is exactly what happens
          at each stage:
        </p>

        <h4 className="font-medium text-gray-900 mt-4">Spreadsheet data</h4>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Processed in your browser.</strong> When you upload a spreadsheet, it is parsed entirely
            in your browser using client-side JavaScript. The raw file is <strong>not uploaded to any server</strong>.
          </li>
          <li>
            <strong>Not stored permanently.</strong> Your spreadsheet data lives in browser memory only for the
            duration of your import session. When you navigate away from the import page or close your browser,
            the data is gone.
          </li>
          <li>
            <strong>Not sent to third parties.</strong> Your spreadsheet contents are never sent to analytics services,
            AI models, or any external APIs. Validation and transformation happen entirely in-browser.
          </li>
        </ul>

        <h4 className="font-medium text-gray-900 mt-4">What IS stored in the database</h4>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Account settings</strong> &mdash; your account ID, username, and preferences.</li>
          <li><strong>Rule configuration</strong> &mdash; which rules are enabled, their target fields, object type assignments, and display order.</li>
          <li><strong>Column headings</strong> &mdash; the output heading names you configure for column mapping.</li>
          <li><strong>Import questions</strong> &mdash; the questions and their configuration (not your answers to them).</li>
          <li><strong>HubSpot integration tokens</strong> &mdash; encrypted OAuth tokens if you connect your HubSpot account.</li>
        </ul>

        <h4 className="font-medium text-gray-900 mt-4">What is NOT stored</h4>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your spreadsheet files or their contents</li>
          <li>Individual row data from your imports</li>
          <li>Validation results or error details</li>
          <li>Your import question answers (used only during the session)</li>
          <li>The transformed/exported data</li>
        </ul>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
          <p className="text-sm">
            <strong>In short:</strong> Your spreadsheet data never leaves your browser. The application stores only
            configuration (rules, headings, questions) and account settings &mdash; never your actual import data.
          </p>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          For full details, see our{' '}
          <Link href="/legal/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link> and{' '}
          <Link href="/legal/terms" className="text-primary-600 hover:underline">Terms of Use</Link>.
        </p>
      </div>
    ),
  },
];

export default function RulesDocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <AdminLayout>
      <div className="flex gap-8">
        {/* Sidebar TOC */}
        <nav className="w-56 shrink-0 hidden lg:block">
          <div className="sticky top-0">
            <Link
              href="/rules"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Rules
            </Link>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contents</h3>
            <ul className="space-y-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    onClick={() => setActiveSection(section.id)}
                    className={`block px-3 py-1.5 text-sm rounded transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 min-w-0 max-w-3xl">
          <div className="mb-6">
            <Link
              href="/rules"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 lg:hidden mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Rules
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Rules Configuration Guide</h1>
            <p className="text-gray-600 mt-1">
              Learn how to configure, customize, and write validation rules for your data imports.
            </p>
          </div>

          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  {section.title}
                </h2>
                <div className="text-gray-700 leading-relaxed">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
