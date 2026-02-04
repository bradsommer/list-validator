'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">Upload and validate spreadsheets. Data is cleaned and formatted for export.</p>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/import" className="bg-blue-50 rounded-lg p-5 border border-blue-200 hover:bg-blue-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Import & Validate</p>
                <p className="text-sm text-blue-700">Upload a CSV or Excel file to clean and validate</p>
              </div>
            </div>
          </Link>

          <Link href="/rules" className="bg-purple-50 rounded-lg p-5 border border-purple-200 hover:bg-purple-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-900">Validation Rules</p>
                <p className="text-sm text-purple-700">Configure which rules run during import</p>
              </div>
            </div>
          </Link>

          <Link href="/column-headings" className="bg-green-50 rounded-lg p-5 border border-green-200 hover:bg-green-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">Column Headings</p>
                <p className="text-sm text-green-700">Manage HubSpot column heading names</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
