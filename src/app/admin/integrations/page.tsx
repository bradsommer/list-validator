'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';

interface Integration {
  id: string;
  account_id: string;
  provider: string;
  is_active: boolean;
  portal_id: string | null;
  connected_at: string | null;
  metadata: Record<string, unknown>;
}

const AVAILABLE_INTEGRATIONS = [
  {
    provider: 'hubspot',
    name: 'HubSpot',
    description: 'Sync contacts, companies, and properties with HubSpot CRM.',
    color: '#ff7a59',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M17.83 11.14V7.52a2.12 2.12 0 0 0 1.23-1.92 2.14 2.14 0 0 0-2.14-2.14 2.14 2.14 0 0 0-2.14 2.14c0 .84.5 1.57 1.21 1.92v3.62a4.93 4.93 0 0 0-2.31 1.19l-6.1-4.75a2.07 2.07 0 0 0 .06-.48 2.07 2.07 0 1 0-2.07 2.07c.35 0 .68-.09.97-.25l5.99 4.66a4.94 4.94 0 0 0-.49 2.14 5 5 0 0 0 5 5 5 5 0 0 0 5-5 4.99 4.99 0 0 0-4.21-4.94zm-.91 7.44a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
      </svg>
    ),
  },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hubspotConnected, setHubspotConnected] = useState(false);
  const [hubspotPortalId, setHubspotPortalId] = useState<string | null>(null);
  const [hubspotAuthorizeUrl, setHubspotAuthorizeUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchIntegrations();
    checkHubSpotConnection();

    // Check for OAuth callback params
    const params = new URLSearchParams(window.location.search);
    if (params.get('hubspot_connected') === 'true') {
      setMessage({ type: 'success', text: 'HubSpot connected successfully!' });
      setHubspotConnected(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('hubspot_error')) {
      setMessage({ type: 'error', text: `HubSpot connection failed: ${params.get('hubspot_error')}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/integrations', {
        headers: {
          'x-account-id': user?.accountId || 'dev-account-id',
        },
      });
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch {
      console.error('Error fetching integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const checkHubSpotConnection = async () => {
    try {
      const response = await fetch('/api/hubspot/oauth', {
        headers: {
          'x-account-id': user?.accountId || 'dev-account-id',
        },
      });
      const data = await response.json();
      setHubspotConnected(data.connected);
      setHubspotPortalId(data.portalId || null);
      setHubspotAuthorizeUrl(data.authorizeUrl || null);
    } catch {
      setHubspotConnected(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Disconnect from ${provider}? This will remove the integration.`)) return;

    try {
      if (provider === 'hubspot') {
        await fetch('/api/hubspot/oauth', {
          method: 'DELETE',
          headers: {
            'x-account-id': user?.accountId || 'dev-account-id',
          },
        });
      }
      setHubspotConnected(false);
      setMessage({ type: 'success', text: `${provider} disconnected successfully.` });
      fetchIntegrations();
      checkHubSpotConnection();
    } catch {
      setMessage({ type: 'error', text: `Failed to disconnect ${provider}.` });
    }
  };

  const handleSyncProperties = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const response = await fetch('/api/hubspot/properties', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'HubSpot properties synced successfully.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to sync properties.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to sync HubSpot properties.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const getIntegrationStatus = (provider: string) => {
    if (provider === 'hubspot') return hubspotConnected;
    return integrations.some(i => i.provider === provider && i.is_active);
  };

  const getIntegrationData = (provider: string) => {
    return integrations.find(i => i.provider === provider);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
          <p className="text-gray-500 text-sm mt-1">
            Connect third-party services to your account. Integrations are shared across all users in your organization.
          </p>
          {user?.accountName && (
            <p className="text-sm text-primary-600 mt-1 font-medium">
              Account: {user.accountName}
            </p>
          )}
        </div>

        {/* Status message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Integration cards */}
        <div className="space-y-4">
          {AVAILABLE_INTEGRATIONS.map((integration) => {
            const connected = getIntegrationStatus(integration.provider);
            const data = getIntegrationData(integration.provider);

            return (
              <div
                key={integration.provider}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${integration.color}15`, color: integration.color }}
                    >
                      {integration.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                        {connected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                            Not connected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
                      {connected && integration.provider === 'hubspot' && hubspotPortalId && (
                        <p className="text-sm text-gray-600 mt-1">
                          Portal ID: <span className="font-mono font-medium">{hubspotPortalId}</span>
                        </p>
                      )}
                      {connected && data?.connected_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Connected {new Date(data.connected_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {connected ? (
                      <>
                        {integration.provider === 'hubspot' && (
                          <button
                            onClick={handleSyncProperties}
                            disabled={isSyncing}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                          >
                            {isSyncing ? (
                              <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Syncing...
                              </>
                            ) : (
                              'Sync Properties'
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDisconnect(integration.provider)}
                          className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : integration.provider === 'hubspot' && hubspotAuthorizeUrl ? (
                      <a
                        href={hubspotAuthorizeUrl}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: integration.color }}
                      >
                        Connect {integration.name}
                      </a>
                    ) : integration.provider === 'hubspot' ? (
                      <span className="text-sm text-gray-500">
                        Set HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET in .env.local
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Additional details when connected */}
                {connected && integration.provider === 'hubspot' && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span>Features: Contact sync, Company matching, Property management</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-900">About Integrations</h4>
              <p className="text-sm text-blue-700 mt-1">
                Integrations are connected at the account level and shared by all users in your organization.
                Only administrators can add or remove integrations. Connected services allow the platform to
                sync data, pull properties, and push validated contacts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
