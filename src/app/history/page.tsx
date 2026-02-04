'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

interface ImportSession {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  enrichedRows: number;
  syncedRows: number;
  failedRows: number;
  hasFile: boolean;
  fileSize: number | null;
  expiresAt: string;
  createdAt: string;
  errorMessage: string | null;
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

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function daysUntilExpiry(expiresAt: string): { days: number; label: string; urgent: boolean } {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return { days: 0, label: 'Expired', urgent: true };
  if (days === 1) return { days, label: '1 day left', urgent: true };
  if (days <= 3) return { days, label: `${days} days left`, urgent: true };
  return { days, label: `${days} days left`, urgent: false };
}

export default function ImportHistoryPage() {
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('upload_sessions')
          .select('id, file_name, status, total_rows, enriched_rows, synced_rows, failed_rows, file_size, expires_at, created_at, error_message')
          .order('created_at', { ascending: false })
          .limit(50);

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        const { data, error } = await query;

        if (!error && data) {
          setSessions(
            data.map((s: Record<string, unknown>) => ({
              id: s.id as string,
              fileName: s.file_name as string,
              status: s.status as string,
              totalRows: s.total_rows as number,
              enrichedRows: s.enriched_rows as number,
              syncedRows: s.synced_rows as number,
              failedRows: s.failed_rows as number,
              hasFile: !!(s.file_size),
              fileSize: s.file_size as number | null,
              expiresAt: s.expires_at as string,
              createdAt: s.created_at as string,
              errorMessage: s.error_message as string | null,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch import history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [filter]);

  const handleDownload = async (session: ImportSession) => {
    setDownloadingId(session.id);
    try {
      const response = await fetch(`/api/pipeline/sessions/${session.id}/download`);
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Download failed');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = session.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file');
    } finally {
      setDownloadingId(null);
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'uploaded', label: 'Uploaded' },
    { value: 'enriched', label: 'Enriched' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'expired', label: 'Expired' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            View past imports and download original files within the 15-day retention window.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
            Loading import history...
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 px-5 py-12 text-center text-gray-500">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium text-gray-700 mb-1">No import history</p>
            <p className="text-sm">Import history will appear here after you upload files.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rows</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retention</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((session) => {
                  const expiry = daysUntilExpiry(session.expiresAt);
                  const isExpired = session.status === 'expired' || expiry.days <= 0;

                  return (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="text-sm font-medium text-gray-900">{session.fileName}</div>
                        {session.errorMessage && session.status === 'failed' && (
                          <p className="text-xs text-red-500 mt-0.5 truncate max-w-xs" title={session.errorMessage}>
                            {session.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm">{statusBadge(session.status)}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        <div>{session.totalRows.toLocaleString()} total</div>
                        {session.syncedRows > 0 && (
                          <div className="text-xs text-green-600">{session.syncedRows} synced</div>
                        )}
                        {session.failedRows > 0 && (
                          <div className="text-xs text-red-600">{session.failedRows} failed</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {formatFileSize(session.fileSize)}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {isExpired ? (
                          <span className="text-gray-400">Expired</span>
                        ) : (
                          <span className={expiry.urgent ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {expiry.label}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {session.hasFile && !isExpired ? (
                          <button
                            onClick={() => handleDownload(session)}
                            disabled={downloadingId === session.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {downloadingId === session.id ? (
                              <div className="animate-spin w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            )}
                            Download
                          </button>
                        ) : isExpired ? (
                          <span className="text-xs text-gray-400">File deleted</span>
                        ) : (
                          <span className="text-xs text-gray-400">No file</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Retention info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-700">
              <p className="font-medium">15-day file retention</p>
              <p className="mt-1 text-blue-600">
                Original uploaded files are stored for 15 days and then automatically deleted.
                Download any files you need before they expire.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
