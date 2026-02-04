'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { getAvailableScripts } from '@/lib/scripts';
import type { ValidationScript } from '@/types';

// Script source code for display (descriptions of what each rule does)
const SCRIPT_SOURCE: Record<string, string> = {
  'whitespace-validation': `// Whitespace Validation Rule
// Targets: "Whitespace" column
// - Value must be "Yes", "No", or blank
// - Normalizes common variants:
//   "y" / "n"         → "Yes" / "No"
//   "true" / "false"  → "Yes" / "No"
//   "1" / "0"         → "Yes" / "No"
// - Any other value is cleared to blank and flagged as a warning`,

  'new-business-validation': `// New Business Validation Rule
// Targets: "New Business" column
// - Value must be "Yes", "No", or blank
// - Normalizes common variants:
//   "y" / "n"         → "Yes" / "No"
//   "true" / "false"  → "Yes" / "No"
//   "1" / "0"         → "Yes" / "No"
// - Any other value is cleared to blank and flagged as a warning`,

  'role-normalization': `// Role Normalization Rule
// - Checks role values against an allowed list
// - Case-insensitive matching (e.g., "admin" → "Admin")
// - Non-matching values are set to "Other"

const VALID_ROLES = [
  'Admin',
  'Administrator',
  'Ascend Employee',
  'ATI Champion',
  'ATI Employee',
  'Champion Nominee',
  'Coordinator',
  'Dean',
  'Director',
  'Educator',
  'Instructor',
  'Other',
  'Proctor',
  'Student',
  'TEAS Student',
  'LMS Admin',
];

// If the value does not exactly match (case-insensitive),
// the role is set to "Other".`,

  'program-type-normalization': `// Program Type Normalization Rule
// - Checks Program Type values against an allowed list
// - Case-insensitive matching fixes casing mismatches
// - Non-matching values are set to "Other"
// - Blank values are left blank

const VALID_PROGRAM_TYPES = [
  'ADN', 'BSN', 'OTHER-BSN', 'RN', 'PN',
  'Allied Health', 'Diploma', 'Other', 'Testing Center',
  'ATI Allied Health', 'RN to BSN', 'APRN', 'Healthcare',
  'Bookstore', 'LPN', 'DNP', 'MSN', 'CNA',
  'ADN - Online', 'BSN - Online', 'BSN Philippines',
  'CT', 'CV Sonography', 'Dental Assisting', 'Dental Hygiene',
  'HCO', 'Health Occupations', 'Healthcare-ADN', 'Hospital',
  'ICV', 'LPN to RN', 'MRI', 'Medical Assisting',
  'Medical Sonography', 'NHA Allied Health', 'Nuclear Medicine',
  'Occupational Assisting', 'PN - Online', 'PhD',
  'Physical Therapy', 'Radiation Therapy', 'Radiography',
  'Resident', 'Respiratory Therapy', 'Sports Medicine',
  'TEAS Only', 'Test Program Type', 'Therapeutic Massage',
];`,

  'solution-normalization': `// Solution Normalization Rule
// - Checks Solution values against an allowed list
// - Case-insensitive matching fixes casing mismatches
// - Non-matching values are set to "Other"
// - Blank values are left blank

const VALID_SOLUTIONS = [
  'CARP', 'BASIC', 'SUPREME', 'OPTIMAL',
  'COMPLETE', 'STO', 'MID-MARKET',
];`,

  'email-validation': `// Email Validation Rule
// - Trims whitespace and converts to lowercase
// - Validates email format (RFC-compliant regex)
// - Flags disposable email domains (mailinator, guerrillamail, etc.)
// - Warns about personal email domains (gmail, yahoo, hotmail, etc.)
// - Detects common domain typos (gmial.com → gmail.com)

const PERSONAL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'aol.com', 'icloud.com', 'protonmail.com', 'zoho.com'
];

const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'tempmail.com',
  'throwaway.email', '10minutemail.com', 'temp-mail.org'
];

// Detects: invalid format, disposable domains, personal domains, typos`,

  'phone-normalization': `// Phone Number Normalization Rule
// - Standardizes all phone numbers to +1XXXXXXXXXX format
// - Assumes US country code (+1) when not present
// - Strips all formatting (dashes, spaces, parentheses)
// - Warns about numbers with too few digits (< 7)
// - International numbers keep their country code

// Example transformations:
//   "5551234567"     → "+15551234567"
//   "1-555-123-4567" → "+15551234567"
//   "(555) 123-4567" → "+15551234567"
//   "+44207946095"   → "+44207946095"`,

  'state-normalization': `// US State Normalization Rule
// - Converts 2-letter abbreviations to full state names
// - Case-insensitive matching ("ca" → "California")
// - Fixes common misspellings ("Califronia" → "California")
// - Supports all 50 US states + DC + territories
// - Detects "State", "State/Region", "State/Province" headers

// Example transformations:
//   "AZ"          → "Arizona"
//   "ca"          → "California"
//   "NY"          → "New York"
//   "Califronia"  → "California"`,

  'date-normalization': `// Date Normalization Rule
// - Standardizes date fields to MM/DD/YYYY format
// - Date/time fields (headers with "time") → DD/MM/YYYY HH:MM
// - Handles multiple input formats:
//   YYYY-MM-DD, DD-MM-YYYY, Month DD YYYY, timestamps
// - Warns about ambiguous date formats

// Example transformations:
//   "2024-01-15"       → "01/15/2024"
//   "January 15, 2024" → "01/15/2024"
//   "2024-01-15T14:30" → "15/01/2024 14:30" (datetime field)`,

  'name-capitalization': `// Name Capitalization Rule
// - Properly capitalizes first and last names
// - Handles special prefixes: McDonald, MacArthur, O'Brien
// - Preserves lowercase prefixes: van, von, de, del, della, di
// - Formats suffixes: Jr., Sr., III, PhD, MD
// - Handles hyphenated names: Smith-Jones
// - Warns about ALL CAPS names

// Example transformations:
//   "john"       → "John"
//   "MCDONALD"   → "McDonald"
//   "o'brien"    → "O'Brien"
//   "VAN DER BERG" → "van der Berg"`,

  'company-normalization': `// Company Name Normalization Rule
// - Standardizes common company suffixes:
//   Inc, LLC, Ltd, Corp, Co → consistent format
// - Removes extra whitespace
// - Normalizes "&" vs "and"
// - Trims trailing punctuation
// - Preserves original casing for company names

// Example transformations:
//   "Acme inc."     → "Acme Inc."
//   "Widget co"     → "Widget Co."
//   "Smith&Jones"   → "Smith & Jones"`,

  'duplicate-detection': `// Duplicate Detection Rule
// - Identifies duplicate entries by email address
// - Detects duplicates by first + last name combination
// - Detects duplicates by phone number
// - Reports all duplicate row numbers for review
// - Does not remove duplicates (flags only)

// Detection methods:
//   1. Exact email match (case-insensitive)
//   2. First name + Last name match (case-insensitive)
//   3. Phone number match (digits only comparison)`,
};

export default function RulesPage() {
  const [scripts, setScripts] = useState<ValidationScript[]>([]);
  const [enabledScripts, setEnabledScripts] = useState<Set<string>>(new Set());
  const [expandedScript, setExpandedScript] = useState<string | null>(null);

  useEffect(() => {
    const available = getAvailableScripts();
    setScripts(available);

    // Load enabled state from localStorage
    const saved = localStorage.getItem('enabled_validation_rules');
    const allIds = new Set(available.map((s) => s.id));
    if (saved) {
      const savedIds = JSON.parse(saved) as string[];
      // Filter to only include IDs that still exist
      const validIds = savedIds.filter((id) => allIds.has(id));
      if (validIds.length > 0) {
        setEnabledScripts(new Set(validIds));
      } else {
        // All saved IDs were stale — enable all
        setEnabledScripts(allIds);
      }
    } else {
      // Enable all by default
      setEnabledScripts(allIds);
    }
  }, []);

  const toggleRule = (scriptId: string) => {
    setEnabledScripts((prev) => {
      const next = new Set(prev);
      if (next.has(scriptId)) {
        next.delete(scriptId);
      } else {
        next.add(scriptId);
      }
      localStorage.setItem('enabled_validation_rules', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const enableAll = () => {
    const all = new Set(scripts.map((s) => s.id));
    setEnabledScripts(all);
    localStorage.setItem('enabled_validation_rules', JSON.stringify(Array.from(all)));
  };

  const disableAll = () => {
    setEnabledScripts(new Set());
    localStorage.setItem('enabled_validation_rules', JSON.stringify([]));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">
              Validation rules that clean and format your uploaded data. Toggle rules on or off to control which validations run during import.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={enableAll}
              className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
            >
              Enable All
            </button>
            <button
              onClick={disableAll}
              className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              Disable All
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {enabledScripts.size} of {scripts.length} rules enabled
        </div>

        <div className="space-y-3">
          {scripts.map((script) => {
            const isEnabled = enabledScripts.has(script.id);
            const isExpanded = expandedScript === script.id;
            const source = SCRIPT_SOURCE[script.id];

            return (
              <div
                key={script.id}
                className={`border rounded-lg overflow-hidden ${
                  isEnabled ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleRule(script.id)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        isEnabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          isEnabled ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{script.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          script.type === 'transform'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {script.type === 'transform' ? 'Transform' : 'Validate'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{script.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          Target fields: {script.targetFields.join(', ')}
                        </span>
                        <span className="text-xs text-gray-400">
                          Order: {script.order}
                        </span>
                      </div>
                    </div>
                  </div>

                  {source && (
                    <button
                      onClick={() => setExpandedScript(isExpanded ? null : script.id)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                    >
                      {isExpanded ? 'Hide Code' : 'View Code'}
                    </button>
                  )}
                </div>

                {/* Code view */}
                {isExpanded && source && (
                  <div className="border-t border-gray-200 bg-gray-900 p-4 overflow-x-auto">
                    <pre className="text-sm text-green-400 font-mono whitespace-pre">{source}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {scripts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No validation rules found.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
