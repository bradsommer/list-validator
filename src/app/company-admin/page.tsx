'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface AccountStats {
  id: string;
  name: string;
  slug: string;
  userCount: number;
  importCount: number;
  ruleCount: number;
  enabledRuleCount: number;
}

interface MonthlyImport {
  month: string;
  label: string;
  count: number;
}

type DateRange = '6m' | '12m' | '24m';

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '6m', label: '6 months' },
  { value: '12m', label: '12 months' },
  { value: '24m', label: '24 months' },
];

function getMonthsInRange(range: DateRange): { start: Date; months: number } {
  const now = new Date();
  const monthsBack = range === '6m' ? 5 : range === '12m' ? 11 : 23;
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return { start, months: monthsBack + 1 };
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function CompanyAdminPage() {
  const { isCompanyAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [accountStats, setAccountStats] = useState<AccountStats[]>([]);
  const [rawImportCounts, setRawImportCounts] = useState<Record<string, number>>({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalImports, setTotalImports] = useState(0);
  const [totalRowsProcessed, setTotalRowsProcessed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('12m');

  useEffect(() => {
    if (!authLoading && !isCompanyAdmin) {
      router.push('/');
    }
  }, [authLoading, isCompanyAdmin, router]);

  useEffect(() => {
    if (!isCompanyAdmin) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all dashboard data in one request
        const { start } = getMonthsInRange('24m');
        const dashRes = await fetch(`/api/company-admin/dashboard?startDate=${encodeURIComponent(start.toISOString())}`);
        const dashJson = await dashRes.json();
        const accounts = dashJson.accounts;
        const users = dashJson.users;
        const sessions = dashJson.sessions;
        const rules = dashJson.rules;

        // Build monthly import counts
        const monthlyCounts: Record<string, number> = {};
        let totalRows = 0;
        if (sessions) {
          for (const s of sessions) {
            const d = new Date(s.created_at);
            const key = formatMonthKey(d);
            monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
            totalRows += s.total_rows || 0;
          }
        }
        setRawImportCounts(monthlyCounts);
        setTotalRowsProcessed(totalRows);
        setTotalImports(sessions?.length || 0);
        setTotalUsers(users?.length || 0);

        // Build per-account stats
        const stats: AccountStats[] = (accounts || []).map((acct) => {
          const acctUsers = users?.filter((u) => u.account_id === acct.id) || [];
          const acctSessions = sessions?.filter((s) => s.account_id === acct.id) || [];
          const acctRules = rules?.filter((r) => r.account_id === acct.id) || [];
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

        setAccountStats(stats);
      } catch (err) {
        console.error('Failed to fetch company admin stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isCompanyAdmin]);

  const chartData: MonthlyImport[] = useMemo(() => {
    const { start, months } = getMonthsInRange(range);
    const data: MonthlyImport[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = formatMonthKey(d);
      data.push({
        month: key,
        label: formatMonthLabel(d),
        count: rawImportCounts[key] || 0,
      });
    }
    return data;
  }, [range, rawImportCounts]);

  const totalActiveRules = accountStats.reduce((sum, a) => sum + a.enabledRuleCount, 0);

  // Rough estimate: ~2 min saved per import vs manual cleaning
  const minutesSaved = totalImports * 2;
  const timeSavedLabel = minutesSaved >= 60
    ? `${Math.round(minutesSaved / 60)} hours`
    : `${minutesSaved} min`;

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
                <p className="text-2xl font-bold text-gray-900 mt-1">{accountStats.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalUsers}</p>
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

            {/* Imports per month chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Imports per Month (All Accounts)</h3>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRange(opt.value)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        range === opt.value
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      interval={range === '24m' ? 2 : 0}
                      angle={range === '24m' ? -45 : 0}
                      textAnchor={range === '24m' ? 'end' : 'middle'}
                      height={range === '24m' ? 60 : 30}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 13,
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(value: unknown) => [String(value), 'Imports']}
                      labelFormatter={(label: unknown) => String(label)}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#0B8377"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#0B8377', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#0B8377', strokeWidth: 2, stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

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
                  {accountStats.map((acct) => (
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
