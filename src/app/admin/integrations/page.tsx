'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isConnecting, setIsConnecting] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (message) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setMessage(null), 3500);
      return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
    }
  }, [message]);

  useEffect(() => {
    if (!user?.accountId) return;

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
  }, [user?.accountId]);

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/integrations', {
        headers: {
          'x-account-id': user?.accountId || '',
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
          'x-account-id': user?.accountId || '',
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
            'x-account-id': user?.accountId || '',
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
    if (!user?.accountId) {
      setMessage({ type: 'error', text: 'No account ID available. Please contact your administrator.' });
      return;
    }
    setIsSyncing(true);
    setMessage(null);
    try {
      // Sync properties and column headings in sequence
      const propsResponse = await fetch('/api/hubspot/properties', {
        method: 'POST',
        headers: {
          'x-account-id': user.accountId,
        },
      });
      const propsData = await propsResponse.json();

      const headingsResponse = await fetch('/api/hubspot/sync-headings', {
        method: 'POST',
        headers: {
          'x-account-id': user.accountId,
        },
      });
      const headingsData = await headingsResponse.json();

      if (propsData.success && headingsData.success) {
        setMessage({
          type: 'success',
          text: `${propsData.message} Column headings: ${headingsData.added} added, ${headingsData.updated} updated, ${headingsData.removed} removed.`,
        });
      } else {
        setMessage({ type: 'error', text: propsData.error || headingsData.error || 'Failed to sync.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to sync HubSpot properties.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Listen for OAuth popup result
  const handleOAuthMessage = useCallback((event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    try {
      const result = JSON.parse(event.data);
      if (result.success) {
        setMessage({ type: 'success', text: 'HubSpot connected successfully!' });
        setHubspotConnected(true);
        // Small delay before re-checking — gives the server time to persist tokens
        // and invalidate the connection cache before we query status again.
        setTimeout(() => {
          fetchIntegrations();
          checkHubSpotConnection();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: `HubSpot connection failed: ${result.error || 'unknown'}` });
      }
    } catch {
      // Not a JSON message we care about
    }
    setIsConnecting(false);
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [handleOAuthMessage]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setMessage(null);
    try {
      // Revoke any existing partial authorization at HubSpot, then get a fresh authorize URL
      const response = await fetch('/api/hubspot/oauth/connect', {
        method: 'POST',
        headers: {
          'x-account-id': user?.accountId || '',
        },
      });
      const data = await response.json();
      if (data.success && data.authorizeUrl) {
        // Open in a popup so HubSpot's multi-screen flow isn't interrupted by redirects
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          data.authorizeUrl,
          'hubspot_oauth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );
        // If popup was blocked, fall back to direct navigation
        if (!popup) {
          window.location.href = data.authorizeUrl;
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start HubSpot connection.' });
        setIsConnecting(false);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to start HubSpot connection.' });
      setIsConnecting(false);
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

        {/* Toast notification */}
        {message && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {message.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            {message.text}
            <button onClick={() => setMessage(null)} className={`ml-2 p-0.5 rounded ${message.type === 'success' ? 'hover:bg-green-500' : 'hover:bg-red-500'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Re-Sync
                              </>
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
                      <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: integration.color }}
                      >
                        {isConnecting ? 'Connecting...' : `Connect ${integration.name}`}
                      </button>
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
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-primary-900">About Integrations</h4>
              <p className="text-sm text-primary-700 mt-1">
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
