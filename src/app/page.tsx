'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ImportsChart, RANGE_PRESETS, DEFAULT_RANGE_INDEX } from '@/components/dashboard/ImportsChart';
import type { Granularity, RangePreset } from '@/components/dashboard/ImportsChart';
import { FreshSegmentsLogo } from '@/components/FreshSegmentsLogo';
import { appLink, marketingLink, isDomainSplitActive } from '@/lib/domainLinks';

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <FreshSegmentsLogo className="h-7" />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/contact"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Contact Us
              </Link>
              <a
                href={appLink('/login')}
                className="px-4 py-2 text-sm font-medium"
                style={{ color: '#0B8377' }}
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
            Clean Your Data
            <span className="block" style={{ color: '#0B8377' }}>Before It Hits HubSpot</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
            Stop importing messy data. FreshSegments automatically cleans, standardizes, and validates your spreadsheets so you can upload perfect data to HubSpot every time.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 text-white rounded-xl font-semibold text-lg transition-colors"
              style={{ backgroundColor: '#0B8377' }}
            >
              Start Free Trial
            </Link>
            <a
              href={appLink('/login')}
              className="px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold text-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Sign In
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            $19.99/month after 14-day free trial. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Everything You Need for Clean Data</h2>
            <p className="mt-4 text-lg text-gray-600">Powerful features to transform your messy spreadsheets into HubSpot-ready data.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#ccfbf1' }}>
                <svg className="w-6 h-6" style={{ color: '#0B8377' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Validation Rules</h3>
              <p className="text-gray-600">Create custom rules to catch errors before they become problems. Validate emails, phone numbers, required fields, and more.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Auto-Formatting</h3>
              <p className="text-gray-600">Automatically standardize phone numbers, capitalize names properly, fix state abbreviations, and normalize data formats.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Column Mapping</h3>
              <p className="text-gray-600">Map your spreadsheet columns to HubSpot properties with smart auto-matching. Remembers your preferences for future imports.</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Questions</h3>
              <p className="text-gray-600">Add metadata to every row with custom questions. Set lead source, campaign, or any custom property for your entire import.</p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Detection</h3>
              <p className="text-gray-600">Instantly see which rows have issues. Review flagged records before export to ensure only clean data reaches HubSpot.</p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">HubSpot-Ready Export</h3>
              <p className="text-gray-600">Export clean, validated CSV files ready to upload directly to HubSpot. No more import errors or data cleanup.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">Three simple steps to clean data.</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start gap-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: '#0B8377' }}>1</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Upload Your Spreadsheet</h3>
                <p className="mt-2 text-gray-600">Drag and drop your CSV or Excel file. We support files with thousands of rows.</p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: '#0B8377' }}>2</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Review & Fix Issues</h3>
                <p className="mt-2 text-gray-600">Our validation rules automatically clean your data and flag any issues that need your attention.</p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: '#0B8377' }}>3</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Export Clean Data</h3>
                <p className="mt-2 text-gray-600">Download your validated, HubSpot-ready file and import it with confidence.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-gray-600">One plan with everything you need.</p>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-white rounded-3xl p-8 border-2 border-teal-200 shadow-xl">
            <div className="text-center">
              <p className="text-sm font-medium uppercase tracking-wide" style={{ color: '#0B8377' }}>Pro Plan</p>
              <div className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-gray-900">$19.99</span>
                <span className="text-xl text-gray-500">/month</span>
              </div>
              <p className="mt-2 text-gray-600">Start with a 14-day free trial</p>
            </div>

            <ul className="mt-8 space-y-4">
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Unlimited imports</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">All validation rules</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Custom import questions</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Column mapping with memory</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">CSV & Excel export</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Team collaboration</span>
              </li>
            </ul>

            <Link
              href="/signup"
              className="mt-8 block w-full py-4 text-white rounded-xl font-semibold text-lg transition-colors text-center"
              style={{ backgroundColor: '#0B8377' }}
            >
              Start Your Free Trial
            </Link>
            <p className="mt-4 text-center text-sm text-gray-500">No credit card required to start</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/">
              <FreshSegmentsLogo className="h-6" dark />
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/documentation" className="hover:text-white transition-colors">
                Documentation
              </Link>
              <span className="text-gray-500">|</span>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact Us
              </Link>
              <span className="text-gray-500">|</span>
              <Link href="/legal/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span className="text-gray-500">|</span>
              <Link href="/legal/terms" className="hover:text-white transition-colors">
                Terms of Use
              </Link>
              <span className="text-gray-500">|</span>
              <button onClick={() => { import('vanilla-cookieconsent').then(cc => cc.showPreferences()); }} className="hover:text-white transition-colors">
                Privacy Choices
              </button>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} FreshSegments. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
}

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Dashboard() {
  const { user } = useAuth();

  // Date range state (shared between chart and time-saved card)
  const defaultRange = RANGE_PRESETS[DEFAULT_RANGE_INDEX].getRange();
  const [startDate, setStartDate] = useState<Date>(defaultRange.start);
  const [endDate, setEndDate] = useState<Date>(defaultRange.end);
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [activePresetLabel, setActivePresetLabel] = useState<string>(RANGE_PRESETS[DEFAULT_RANGE_INDEX].label);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [granularityOpen, setGranularityOpen] = useState(false);
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [customStart, setCustomStart] = useState(toInputDate(defaultRange.start));
  const [customEnd, setCustomEnd] = useState(toInputDate(defaultRange.end));
  const datePickerRef = useRef<HTMLDivElement>(null);
  const granularityRef = useRef<HTMLDivElement>(null);

  // Raw import rows (shared between chart and time-saved card)
  const [rawRows, setRawRows] = useState<{ created_at: string; enabled_rule_count: number | null }[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(true);
  const [fallbackRuleCount, setFallbackRuleCount] = useState(0);

  // Fetch import sessions and enabled rule count
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.accountId) return;
      setIsLoadingRows(true);
      try {
        // Fetch sessions via server-side API (uses service-role key, bypasses RLS)
        const sessionsPromise = fetch('/api/pipeline/sessions', {
          headers: { 'x-account-id': user.accountId },
        }).then(async (res) => {
          if (!res.ok) return [];
          const json = await res.json();
          return (json.sessions || []).map((s: { createdAt: string; enabledRuleCount?: number | null }) => ({
            created_at: s.createdAt,
            enabled_rule_count: s.enabledRuleCount ?? null,
          }));
        });

        // Fallback rule count for older sessions that don't have per-session data
        const rulesPromise = fetch(`/api/dashboard-stats?accountId=${encodeURIComponent(user.accountId)}`)
          .then((r) => r.json());

        const [sessions, rulesResult] = await Promise.all([sessionsPromise, rulesPromise]);

        setRawRows(sessions);
        if (rulesResult.enabledRulesCount != null) {
          setFallbackRuleCount(rulesResult.enabledRulesCount);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoadingRows(false);
      }
    };
    fetchData();
  }, [user?.accountId]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
        setCustomPickerOpen(false);
      }
      if (granularityRef.current && !granularityRef.current.contains(e.target as Node)) {
        setGranularityOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePresetSelect = useCallback((preset: RangePreset) => {
    const { start, end } = preset.getRange();
    setStartDate(start);
    setEndDate(end);
    setActivePresetLabel(preset.label);
    setDatePickerOpen(false);
    setCustomPickerOpen(false);
  }, []);

  const handleCustomApply = useCallback(() => {
    const s = new Date(customStart + 'T00:00:00');
    const e = new Date(customEnd + 'T00:00:00');
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s <= e) {
      setStartDate(s);
      setEndDate(e);
      setActivePresetLabel('Custom');
      setDatePickerOpen(false);
      setCustomPickerOpen(false);
    }
  }, [customStart, customEnd]);

  // Compute filtered import count and time saved using per-session rule counts
  const { filteredImportCount, minutesSaved } = (() => {
    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    rangeEnd.setHours(23, 59, 59, 999);
    let count = 0;
    let totalMinutes = 0;
    for (const row of rawRows) {
      const d = new Date(row.created_at);
      if (d >= rangeStart && d <= rangeEnd) {
        count++;
        // Use per-session rule count if available, fall back to current account count
        const ruleCount = row.enabled_rule_count ?? fallbackRuleCount;
        totalMinutes += ruleCount * 5;
      }
    }
    return { filteredImportCount: count, minutesSaved: totalMinutes };
  })();
  const hoursSaved = Math.floor(minutesSaved / 60);
  const remainingMinutes = minutesSaved % 60;
  const timeSavedDisplay = hoursSaved > 0
    ? `${hoursSaved}h ${remainingMinutes}m`
    : `${minutesSaved}m`;

  const granularityLabel = granularity.charAt(0).toUpperCase() + granularity.slice(1);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with date controls */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {/* Date range picker */}
          <div ref={datePickerRef} className="relative">
            <button
              onClick={() => { setDatePickerOpen(!datePickerOpen); setGranularityOpen(false); }}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-gray-400 bg-white"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{activePresetLabel === 'Custom' ? formatDateRange(startDate, endDate) : activePresetLabel}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${datePickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {datePickerOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[220px]">
                {RANGE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetSelect(preset)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      activePresetLabel === preset.label ? 'text-gray-900 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => setCustomPickerOpen(!customPickerOpen)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                      activePresetLabel === 'Custom' ? 'text-gray-900 font-medium' : 'text-gray-700'
                    }`}
                  >
                    Custom range
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${customPickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {customPickerOpen && (
                    <div className="px-4 py-3 space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Start date</label>
                        <input
                          type="date"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">End date</label>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <button
                        onClick={handleCustomApply}
                        className="w-full py-1.5 text-sm font-medium text-white rounded"
                        style={{ backgroundColor: '#0B8377' }}
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Granularity dropdown */}
          <div ref={granularityRef} className="relative">
            <button
              onClick={() => { setGranularityOpen(!granularityOpen); setDatePickerOpen(false); }}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-gray-400 bg-white min-w-[90px]"
            >
              <span>{granularityLabel}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${granularityOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {granularityOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[110px]">
                {(['day', 'month', 'year'] as Granularity[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => { setGranularity(g); setGranularityOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      granularity === g ? 'text-gray-900 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <ImportsChart
              startDate={startDate}
              endDate={endDate}
              granularity={granularity}
              rawRows={rawRows}
              isLoading={isLoadingRows}
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ccfbf1' }}>
              <svg className="w-6 h-6" style={{ color: '#0B8377' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{timeSavedDisplay}</p>
            <p className="text-sm text-gray-500">Estimated time saved across {filteredImportCount} import{filteredImportCount !== 1 ? 's' : ''}</p>
            <p className="mt-2 text-xs text-gray-400">Based on 5 minutes saved per rule per import</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/import" className="bg-white rounded-lg p-5 border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-teal-100">
                <svg className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Import</p>
                <p className="text-sm text-gray-600">Upload a CSV or Excel file to clean and validate</p>
              </div>
            </div>
          </Link>

          <Link href="/rules" className="bg-white rounded-lg p-5 border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Rules</p>
                <p className="text-sm text-gray-600">Configure which rules run during import</p>
              </div>
            </div>
          </Link>

          <Link href="/column-headings" className="bg-white rounded-lg p-5 border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Output Headings</p>
                <p className="text-sm text-gray-600">Manage column heading names</p>
              </div>
            </div>
          </Link>

          <Link href="/import-questions" className="bg-white rounded-lg p-5 border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Import Questions</p>
                <p className="text-sm text-gray-600">Set metadata questions for each import</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // When domain splitting is active, determine which domain we're on
  const isAppDomain = isDomainSplitActive && typeof window !== 'undefined' &&
    window.location.hostname === new URL(process.env.NEXT_PUBLIC_APP_DOMAIN || '').hostname;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#0b8377', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // On app domain: show dashboard if authenticated, redirect to login if not
  if (isAppDomain) {
    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }
    return <Dashboard />;
  }

  // On marketing domain (or when split is disabled): show landing or dashboard
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <Dashboard />;
}
