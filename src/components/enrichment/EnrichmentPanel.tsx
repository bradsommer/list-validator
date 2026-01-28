'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { enrichData, applyEnrichmentResults } from '@/lib/enrichment';
import { logInfo, logError, logSuccess } from '@/lib/logger';
import type { EnrichmentConfig } from '@/types';

export function EnrichmentPanel() {
  const {
    sessionId,
    processedData,
    enrichmentConfigs,
    enrichmentResults,
    isEnriching,
    enrichmentProgress,
    setEnrichmentResults,
    setIsEnriching,
    setEnrichmentProgress,
    setProcessedData,
    updateEnrichmentConfig,
    addEnrichmentConfig,
    removeEnrichmentConfig,
    nextStep,
    prevStep,
  } = useAppStore();

  const [showAddConfig, setShowAddConfig] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    description: '',
    prompt: '',
    inputFields: '',
    outputField: '',
    service: 'serp' as const,
  });

  const handleRunEnrichment = async () => {
    setIsEnriching(true);
    await logInfo('enrich', 'Starting data enrichment', sessionId, {
      totalRows: processedData.length,
      enabledConfigs: enrichmentConfigs.filter((c) => c.isEnabled).length,
    });

    try {
      const results = await enrichData(
        processedData,
        enrichmentConfigs,
        (completed, total) => setEnrichmentProgress({ completed, total })
      );

      setEnrichmentResults(results);

      // Apply enrichment results to processed data
      const enrichedData = applyEnrichmentResults(processedData, results);
      setProcessedData(enrichedData);

      const successCount = results.filter((r) => r.success).length;
      await logSuccess('enrich', `Enrichment complete: ${successCount}/${results.length} successful`, sessionId);
    } catch (error) {
      await logError('enrich', 'Enrichment failed', sessionId, { error });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleAddConfig = () => {
    if (!newConfig.name || !newConfig.outputField) return;

    addEnrichmentConfig({
      id: `enrich_${Date.now()}`,
      name: newConfig.name,
      description: newConfig.description,
      prompt: newConfig.prompt,
      inputFields: newConfig.inputFields.split(',').map((f) => f.trim()).filter((f) => f),
      outputField: newConfig.outputField,
      service: newConfig.service,
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setNewConfig({
      name: '',
      description: '',
      prompt: '',
      inputFields: '',
      outputField: '',
      service: 'serp',
    });
    setShowAddConfig(false);
  };

  const handleSkipEnrichment = () => {
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Data Enrichment</h2>
        <button
          onClick={() => setShowAddConfig(true)}
          className="px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200"
        >
          + Add Enrichment Rule
        </button>
      </div>

      {/* Add config modal */}
      {showAddConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Add Enrichment Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newConfig.name}
                  onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                  placeholder="e.g., Find Company Website"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newConfig.description}
                  onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                  placeholder="What this enrichment does"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
                <textarea
                  value={newConfig.prompt}
                  onChange={(e) => setNewConfig({ ...newConfig, prompt: e.target.value })}
                  placeholder="Given a user's email, city, state, and institution, find..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input Fields (comma-separated)
                </label>
                <input
                  type="text"
                  value={newConfig.inputFields}
                  onChange={(e) => setNewConfig({ ...newConfig, inputFields: e.target.value })}
                  placeholder="email, city, state, institution"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Output Field</label>
                <input
                  type="text"
                  value={newConfig.outputField}
                  onChange={(e) => setNewConfig({ ...newConfig, outputField: e.target.value })}
                  placeholder="e.g., website_url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <select
                  value={newConfig.service}
                  onChange={(e) =>
                    setNewConfig({ ...newConfig, service: e.target.value as 'serp' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="serp">SERP API</option>
                  <option value="clearbit">Clearbit (coming soon)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddConfig(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddConfig}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrichment configs */}
      <div className="space-y-4">
        {enrichmentConfigs.map((config) => (
          <div
            key={config.id}
            className={`border rounded-lg p-4 ${
              config.isEnabled ? 'border-primary-200 bg-primary-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.isEnabled}
                      onChange={(e) =>
                        updateEnrichmentConfig(config.id, { isEnabled: e.target.checked })
                      }
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="font-medium">{config.name}</span>
                  </label>
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                    {config.service.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                <div className="mt-2 text-xs text-gray-500">
                  Input: {config.inputFields.join(', ')} → Output: {config.outputField}
                </div>
              </div>
              <button
                onClick={() => removeEnrichmentConfig(config.id)}
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      {isEnriching && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-blue-700">
              Processing row {enrichmentProgress.completed} of {enrichmentProgress.total}...
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${
                  enrichmentProgress.total > 0
                    ? (enrichmentProgress.completed / enrichmentProgress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Results summary */}
      {enrichmentResults.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-700 mb-2">Enrichment Complete</h3>
          <div className="text-sm text-green-600">
            {enrichmentResults.filter((r) => r.success).length} of {enrichmentResults.length} rows
            successfully enriched
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
            onClick={handleSkipEnrichment}
            className="px-6 py-2 text-gray-600 hover:text-gray-800"
          >
            Skip Enrichment
          </button>
          {enrichmentResults.length === 0 ? (
            <button
              onClick={handleRunEnrichment}
              disabled={isEnriching || !enrichmentConfigs.some((c) => c.isEnabled)}
              className={`px-6 py-2 rounded-lg ${
                isEnriching || !enrichmentConfigs.some((c) => c.isEnabled)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              Run Enrichment
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Continue to HubSpot Sync
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
