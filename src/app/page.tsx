'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

interface RecentSession {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  syncedRows: number;
  failedRows: number;
  createdAt: string;
}

interface DashboardStats {
  totalImports: number;
  totalRowsProcessed: number;
  failedSessions: number;
  recentSessions: RecentSession[];
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    syncing: 'bg-blue-100 text-blue-700',
    enriching: 'bg-blue-100 text-blue-700',
    enriched: 'bg-indigo-100 text-indigo-700',
    uploaded: 'bg-gray-100 text-gray-600',
    failed: 'bg-red-100 text-red-700',
    expired: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colors: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-700', iconBg: 'bg-green-100' },
    red: { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', iconBg: 'bg-orange-100' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`${c.bg} rounded-lg p-5 border border-opacity-50`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${c.iconBg} rounded-lg flex items-center justify-center`}>
          <svg className={`w-5 h-5 ${c.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalImports: 0,
    totalRowsProcessed: 0,
    failedSessions: 0,
    recentSessions: [],
  });
  const [hubspotConnected, setHubspotConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch recent pipeline sessions
        const { data: sessions, error } = await supabase
          .from('upload_sessions')
          .select('id, file_name, status, total_rows, synced_rows, failed_rows, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && sessions) {
          const mapped: RecentSession[] = sessions.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            fileName: s.file_name as string,
            status: s.status as string,
            totalRows: s.total_rows as number,
            syncedRows: s.synced_rows as number,
            failedRows: s.failed_rows as number,
            createdAt: s.created_at as string,
          }));

          const allSessions = sessions;
          setStats({
            totalImports: allSessions.length,
            totalRowsProcessed: allSessions.reduce((sum: number, s: Record<string, unknown>) => sum + (s.total_rows as number || 0), 0),
            failedSessions: allSessions.filter((s: Record<string, unknown>) => s.status === 'failed').length,
            recentSessions: mapped,
          });
        }

        // Check HubSpot connection
        try {
          const hsResponse = await fetch('/api/hubspot/owners');
          setHubspotConnected(hsResponse.ok);
        } catch {
          setHubspotConnected(false);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated]);

  // If not authenticated, AdminLayout handles the redirect
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLayout>
        <div />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Quick actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">Upload, validate, enrich, and sync contact lists to HubSpot.</p>
          </div>
          <Link
            href="/import"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            New Import
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
            Loading dashboard...
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Imports"
                value={stats.totalImports}
                icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                color="blue"
              />
              <StatCard
                label="Rows Processed"
                value={stats.totalRowsProcessed.toLocaleString()}
                icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                color="green"
              />
              <StatCard
                label="Failed Imports"
                value={stats.failedSessions}
                icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                color="red"
              />
              <div className={`${hubspotConnected ? 'bg-green-50' : 'bg-orange-50'} rounded-lg p-5 border border-opacity-50`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${hubspotConnected ? 'bg-green-100' : 'bg-orange-100'} rounded-lg flex items-center justify-center`}>
                    <svg className={`w-5 h-5 ${hubspotConnected ? 'text-green-700' : 'text-orange-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">HubSpot</p>
                    <p className={`text-sm font-semibold ${hubspotConnected ? 'text-green-700' : 'text-orange-700'}`}>
                      {hubspotConnected === null ? 'Checking...' : hubspotConnected ? 'Connected' : 'Not Connected'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent imports */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Recent Imports</h3>
              </div>
              {stats.recentSessions.length === 0 ? (
                <div className="px-5 py-12 text-center text-gray-500">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="font-medium text-gray-700 mb-1">No imports yet</p>
                  <p className="text-sm">
                    <Link href="/import" className="text-primary-600 hover:text-primary-700 font-medium">
                      Start your first import
                    </Link>{' '}
                    to see activity here.
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rows</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Synced</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failed</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.recentSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-sm text-gray-900 font-medium">{session.fileName}</td>
                        <td className="px-5 py-3 text-sm">{statusBadge(session.status)}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{session.totalRows.toLocaleString()}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{session.syncedRows.toLocaleString()}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">
                          {session.failedRows > 0 ? (
                            <span className="text-red-600 font-medium">{session.failedRows}</span>
                          ) : (
                            '0'
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
