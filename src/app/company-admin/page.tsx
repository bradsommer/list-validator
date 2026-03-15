'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ImportsChart, RANGE_PRESETS, DEFAULT_RANGE_INDEX } from '@/components/dashboard/ImportsChart';
import type { Granularity, RangePreset } from '@/components/dashboard/ImportsChart';

interface AccountOption {
  id: string;
  name: string;
  slug: string;
}

interface AccountStats {
  id: string;
  name: string;
  slug: string;
  userCount: number;
  importCount: number;
  ruleCount: number;
  enabledRuleCount: number;
}

interface RawSession {
  id: string;
  account_id: string;
  total_rows: number;
  created_at: string;
}

interface RawUser {
  id: string;
  account_id: string;
}

interface RawRule {
  account_id: string;
  enabled: boolean;
}

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
}

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CompanyAdminPage() {
  const { isCompanyAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Raw data from API
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [allSessions, setAllSessions] = useState<RawSession[]>([]);
  const [allUsers, setAllUsers] = useState<RawUser[]>([]);
  const [allRules, setAllRules] = useState<RawRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Account filter
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const accountPickerRef = useRef<HTMLDivElement>(null);

  // Date range state (matching main dashboard)
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

  useEffect(() => {
    if (!authLoading && !isCompanyAdmin) {
      router.push('/');
    }
  }, [authLoading, isCompanyAdmin, router]);

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
      if (accountPickerRef.current && !accountPickerRef.current.contains(e.target as Node)) {
        setAccountPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch all data once (no startDate filter — fetch everything)
  useEffect(() => {
    if (!isCompanyAdmin) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const dashRes = await fetch('/api/company-admin/dashboard');
        const dashJson = await dashRes.json();

        setAccounts(dashJson.accounts || []);
        setAllUsers(dashJson.users || []);
        setAllSessions(dashJson.sessions || []);
        setAllRules(dashJson.rules || []);
      } catch (err) {
        console.error('Failed to fetch company admin stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isCompanyAdmin]);

  // Filter sessions by selected account
  const filteredSessions = useMemo(() => {
    if (selectedAccountId === 'all') return allSessions;
    return allSessions.filter((s) => s.account_id === selectedAccountId);
  }, [allSessions, selectedAccountId]);

  // Filter users by selected account
  const filteredUsers = useMemo(() => {
    if (selectedAccountId === 'all') return allUsers;
    return allUsers.filter((u) => u.account_id === selectedAccountId);
  }, [allUsers, selectedAccountId]);

  // Filter rules by selected account
  const filteredRules = useMemo(() => {
    if (selectedAccountId === 'all') return allRules;
    return allRules.filter((r) => r.account_id === selectedAccountId);
  }, [allRules, selectedAccountId]);

  // Build raw rows for ImportsChart (needs { created_at: string })
  const chartRawRows = useMemo(() => {
    return filteredSessions.map((s) => ({ created_at: s.created_at }));
  }, [filteredSessions]);

  // Compute summary stats filtered by date range AND account
  const { totalImports, totalRowsProcessed } = useMemo(() => {
    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    rangeEnd.setHours(23, 59, 59, 999);

    let imports = 0;
    let rows = 0;
    for (const s of filteredSessions) {
      const d = new Date(s.created_at);
      if (d >= rangeStart && d <= rangeEnd) {
        imports++;
        rows += s.total_rows || 0;
      }
    }
    return { totalImports: imports, totalRowsProcessed: rows };
  }, [filteredSessions, startDate, endDate]);

  // Per-account stats (always computed from all data, not filtered by date)
  const accountStats: AccountStats[] = useMemo(() => {
    return (accounts || []).map((acct) => {
      const acctUsers = allUsers.filter((u) => u.account_id === acct.id);
      const acctSessions = allSessions.filter((s) => s.account_id === acct.id);
      const acctRules = allRules.filter((r) => r.account_id === acct.id);
      const enabledRules = acctRules.filter((r) => r.enabled);

      return {
        id: acct.id,
        name: acct.name,
        slug: acct.slug,
        userCount: acctUsers.length,
        importCount: acctSessions.length,
        ruleCount: acctRules.length,
        enabledRuleCount: enabledRules.length,
      };
    });
  }, [accounts, allUsers, allSessions, allRules]);

  const totalActiveRules = useMemo(() => {
    return filteredRules.filter((r) => r.enabled).length;
  }, [filteredRules]);

  // Rough estimate: ~2 min saved per import vs manual cleaning
  const minutesSaved = totalImports * 2;
  const timeSavedLabel = minutesSaved >= 60
    ? `${Math.round(minutesSaved / 60)} hours`
    : `${minutesSaved} min`;

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

  const granularityLabel = granularity.charAt(0).toUpperCase() + granularity.slice(1);

  const selectedAccountLabel = selectedAccountId === 'all'
    ? 'All Accounts'
    : accounts.find((a) => a.id === selectedAccountId)?.name || 'All Accounts';

  if (authLoading || (!isCompanyAdmin && !authLoading)) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="text-gray-600">
            Cross-account overview of usage and activity across all companies.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {/* Account filter */}
          <div ref={accountPickerRef} className="relative">
            <button
              onClick={() => { setAccountPickerOpen(!accountPickerOpen); setDatePickerOpen(false); setGranularityOpen(false); }}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-gray-400 bg-white"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>{selectedAccountLabel}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${accountPickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {accountPickerOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[220px] max-h-[300px] overflow-y-auto">
                <button
                  onClick={() => { setSelectedAccountId('all'); setAccountPickerOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    selectedAccountId === 'all' ? 'text-gray-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  All Accounts
                </button>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  {accounts.map((acct) => (
                    <button
                      key={acct.id}
                      onClick={() => { setSelectedAccountId(acct.id); setAccountPickerOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        selectedAccountId === acct.id ? 'text-gray-900 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {acct.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date range picker */}
          <div ref={datePickerRef} className="relative">
            <button
              onClick={() => { setDatePickerOpen(!datePickerOpen); setGranularityOpen(false); setAccountPickerOpen(false); }}
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
              onClick={() => { setGranularityOpen(!granularityOpen); setDatePickerOpen(false); setAccountPickerOpen(false); }}
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

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
            Loading usage data...
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {selectedAccountId === 'all' ? accounts.length : 1}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{filteredUsers.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Total Imports</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalImports}</p>
                <p className="text-xs text-gray-400 mt-0.5">{totalRowsProcessed.toLocaleString()} rows</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Active Rules</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalActiveRules}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Est. Time Saved</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{timeSavedLabel}</p>
              </div>
            </div>

            {/* Imports chart (reusing the shared component) */}
            <ImportsChart
              startDate={startDate}
              endDate={endDate}
              granularity={granularity}
              rawRows={chartRawRows}
              isLoading={false}
            />

            {/* Per-account breakdown table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imports</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Rules</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accountStats
                    .filter((acct) => selectedAccountId === 'all' || acct.id === selectedAccountId)
                    .map((acct) => (
                    <tr key={acct.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">{acct.name}</div>
                        <div className="text-xs text-gray-400">{acct.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{acct.userCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{acct.importCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {acct.enabledRuleCount} / {acct.ruleCount}
                      </td>
                    </tr>
                  ))}
                  {accountStats.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
