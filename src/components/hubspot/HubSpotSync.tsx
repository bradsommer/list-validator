'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { logInfo, logError, logSuccess } from '@/lib/logger';

export function HubSpotSync() {
  const {
    sessionId,
    processedData,
    hubspotResults,
    isSyncing,
    syncProgress,
    defaultTaskAssignee,
    setHubSpotResults,
    setIsSyncing,
    setSyncProgress,
    setDefaultTaskAssignee,
    nextStep,
    prevStep,
  } = useAppStore();

  const [hubspotOwners, setHubspotOwners] = useState<{ id: string; name: string; email: string }[]>(
    []
  );
  const [isLoadingOwners, setIsLoadingOwners] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch HubSpot owners on mount
  useEffect(() => {
    const fetchOwners = async () => {
      setIsLoadingOwners(true);
      try {
        const response = await fetch('/api/hubspot/owners');
        if (response.ok) {
          const data = await response.json();
          setHubspotOwners(data.owners || []);
        }
      } catch (err) {
        console.error('Failed to fetch HubSpot owners:', err);
      } finally {
        setIsLoadingOwners(false);
      }
    };

    fetchOwners();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    await logInfo('hubspot', 'Starting HubSpot sync', sessionId, {
      totalRows: processedData.length,
      taskAssignee: defaultTaskAssignee,
    });

    try {
      const response = await fetch('/api/hubspot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: processedData,
          taskAssigneeId: defaultTaskAssignee,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const results: typeof hubspotResults = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'progress') {
                setSyncProgress({ completed: data.completed, total: data.total });
              } else if (data.type === 'result') {
                results.push(data.result);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      setHubSpotResults(results);

      const newCompanies = results.filter((r) => r.matchType === 'created_new').length;
      await logSuccess(
        'hubspot',
        `Sync complete: ${results.length} contacts processed, ${newCompanies} new companies created`,
        sessionId
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      await logError('hubspot', errorMessage, sessionId, { error: err });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSkipSync = () => {
    nextStep();
  };

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case 'exact_domain':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Domain Match</span>;
      case 'fuzzy_name':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">Fuzzy Match</span>;
      case 'created_new':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">New Company</span>;
      case 'no_match':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">No Match</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">HubSpot Sync</h2>

      {/* Configuration */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Assignee (optional — for new company tasks)
          </label>
          <select
            value={defaultTaskAssignee}
            onChange={(e) => setDefaultTaskAssignee(e.target.value)}
            disabled={isLoadingOwners || isSyncing}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">-- Select an owner --</option>
            {hubspotOwners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name} ({owner.email})
              </option>
            ))}
          </select>
          {isLoadingOwners && (
            <p className="text-sm text-gray-500 mt-1">Loading HubSpot owners...</p>
          )}
        </div>

        <div className="text-sm text-gray-600">
          <p>The sync process will:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Search for existing companies by domain</li>
            <li>Use fuzzy matching for company names if no domain match</li>
            <li>Create new companies if no match is found</li>
            <li>Create/update contacts and associate with companies</li>
            <li>Create a task for the assignee when new companies are created (if assignee selected)</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Progress */}
      {isSyncing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-blue-700">
              Processing contact {syncProgress.completed} of {syncProgress.total}...
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${
                  syncProgress.total > 0
                    ? (syncProgress.completed / syncProgress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Results summary */}
      {hubspotResults.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">
                {hubspotResults.filter((r) => r.matchType === 'exact_domain').length}
              </div>
              <div className="text-sm text-green-600">Domain Matches</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-700">
                {hubspotResults.filter((r) => r.matchType === 'fuzzy_name').length}
              </div>
              <div className="text-sm text-yellow-600">Fuzzy Matches</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-700">
                {hubspotResults.filter((r) => r.matchType === 'created_new').length}
              </div>
              <div className="text-sm text-blue-600">New Companies</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-700">
                {hubspotResults.filter((r) => r.matchType === 'no_match').length}
              </div>
              <div className="text-sm text-gray-600">No Matches</div>
            </div>
          </div>

          {/* Results table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Contact</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Company</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Match Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hubspotResults.slice(0, 50).map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{result.rowIndex + 1}</td>
                      <td className="px-4 py-2 text-sm">{result.contact.email}</td>
                      <td className="px-4 py-2 text-sm">{result.matchedCompany?.name || '-'}</td>
                      <td className="px-4 py-2 text-sm">{getMatchTypeBadge(result.matchType)}</td>
                      <td className="px-4 py-2 text-sm">
                        {Math.round(result.matchConfidence * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={prevStep} className="px-6 py-2 text-gray-600 hover:text-gray-800">
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleSkipSync}
            className="px-6 py-2 text-gray-600 hover:text-gray-800"
          >
            Skip HubSpot Sync
          </button>
          {hubspotResults.length === 0 ? (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`px-6 py-2 rounded-lg ${
                isSyncing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-hubspot-orange text-white hover:bg-orange-600'
              }`}
            >
              Sync to HubSpot
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Continue to Audit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
