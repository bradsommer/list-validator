'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [hubspotConnected, setHubspotConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Check HubSpot connection via account_integrations table
        try {
          const { data: integration } = await supabase
            .from('account_integrations')
            .select('is_active')
            .eq('provider', 'hubspot')
            .eq('is_active', true)
            .limit(1)
            .single();
          setHubspotConnected(!!integration);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HubSpot connection status */}
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
        )}
      </div>
    </AdminLayout>
  );
}
