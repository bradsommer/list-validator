'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { enrichData, applyEnrichmentResults } from '@/lib/enrichment';
import { logInfo, logError, logSuccess } from '@/lib/logger';
import type { EnrichmentConfig } from '@/types';

interface DbEnrichmentConfig {
  id: string;
  name: string;
  description: string | null;
  prompt_template: string;
  input_fields: string[];
  output_field: string;
  is_enabled: boolean;
  execution_order: number;
  ai_model: { name: string; provider: string } | null;
}

export function EnrichmentPanel() {
  const {
    sessionId,
    processedData,
    enrichmentResults,
    isEnriching,
    enrichmentProgress,
    setEnrichmentConfigs,
    setEnrichmentResults,
    setIsEnriching,
    setEnrichmentProgress,
    setProcessedData,
    nextStep,
    prevStep,
  } = useAppStore();

  const [dbConfigs, setDbConfigs] = useState<DbEnrichmentConfig[]>([]);
  const [selectedConfigIds, setSelectedConfigIds] = useState<Set<string>>(new Set());
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);

  // Fetch enrichment configs from database
  useEffect(() => {
    const fetchConfigs = async () => {
      setIsLoadingConfigs(true);
      try {
        const { data, error } = await supabase
          .from('enrichment_configs')
          .select('*, ai_model:ai_models(name, provider)')
          .eq('is_enabled', true)
          .order('execution_order');

        if (error) {
          console.error('Failed to fetch enrichment configs:', error.message);
        } else if (data) {
          setDbConfigs(data as DbEnrichmentConfig[]);
        }
      } catch (err) {
        console.error('Error fetching enrichment configs:', err);
      } finally {
        setIsLoadingConfigs(false);
      }
    };

    fetchConfigs();
  }, []);

  // Convert selected DB configs to the EnrichmentConfig format the enrichment engine expects
  const buildSelectedConfigs = (): EnrichmentConfig[] => {
    return dbConfigs
      .filter((c) => selectedConfigIds.has(c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        prompt: c.prompt_template,
        inputFields: c.input_fields || [],
        outputField: c.output_field,
        service: 'serp' as const,
        isEnabled: true,
        createdAt: '',
        updatedAt: '',
      }));
  };

  const toggleConfig = (id: string) => {
    setSelectedConfigIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRunEnrichment = async () => {
    const configs = buildSelectedConfigs();
    setEnrichmentConfigs(configs);
    setIsEnriching(true);

    await logInfo('enrich', 'Starting data enrichment', sessionId, {
      totalRows: processedData.length,
      enabledConfigs: configs.length,
    });

    try {
      const results = await enrichData(
        processedData,
        configs,
        (completed, total) => setEnrichmentProgress({ completed, total })
      );

      setEnrichmentResults(results);

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

  // Parse output fields for display
  const parseOutputFields = (raw: string): string => {
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((f: { id: string; type: string }) => `${f.id} (${f.type})`).join(', ');
      }
    } catch {
      // Legacy single string
    }
    return raw;
  };

  // Parse input fields for display
  const formatInputField = (field: string): string => {
    if (field.includes(':')) {
      const [objectType, prop] = field.split(':', 2);
      return `${objectType}.${prop}`;
    }
    return field;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Data Enrichment</h2>
        <span className="text-sm text-gray-500">
          {processedData.length} rows to process
        </span>
      </div>

      {/* Available enrichment configs from database */}
      {isLoadingConfigs ? (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading enrichment configurations...
        </div>
      ) : dbConfigs.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">No enrichment configurations found</p>
          <p className="text-yellow-600 text-sm mt-1">
            Create enrichment configs in the{' '}
            <a href="/admin/enrichment" className="underline hover:text-yellow-800">
              Admin &gt; Enrichment
            </a>{' '}
            page, then return here to use them.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Select the enrichment steps to run on your data:
          </p>
          {dbConfigs.map((config) => {
            const isSelected = selectedConfigIds.has(config.id);
            return (
              <div
                key={config.id}
                onClick={() => toggleConfig(config.id)}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleConfig(config.id)}
                    className="w-4 h-4 text-blue-600 rounded mt-1 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{config.name}</span>
                      {config.ai_model && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {config.ai_model.provider.toUpperCase()}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                        Order: {config.execution_order}
                      </span>
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      <span>
                        Input: {config.input_fields.map(formatInputField).join(', ')}
                      </span>
                      <span>
                        Output: {parseOutputFields(config.output_field)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            onClick={nextStep}
            className="px-6 py-2 text-gray-600 hover:text-gray-800"
          >
            Skip Enrichment
          </button>
          {enrichmentResults.length === 0 ? (
            <button
              onClick={handleRunEnrichment}
              disabled={isEnriching || selectedConfigIds.size === 0}
              className={`px-6 py-2 rounded-lg ${
                isEnriching || selectedConfigIds.size === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Run Enrichment ({selectedConfigIds.size} selected)
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue to HubSpot Sync
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
