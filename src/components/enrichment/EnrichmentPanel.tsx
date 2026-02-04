'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
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
  ai_model: {
    name: string;
    provider: string;
    model_id: string;
    api_key_encrypted: string | null;
    use_env_key: boolean;
    env_key_name: string | null;
    base_url: string | null;
  } | null;
}

export function EnrichmentPanel() {
  const {
    sessionId,
    processedData,
    headerMatches,
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
          .select('*, ai_model:ai_models(name, provider, model_id, api_key_encrypted, use_env_key, env_key_name, base_url)')
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
      .map((c) => {
        const hasAiModel = c.ai_model && c.ai_model.provider !== 'serp';
        return {
          id: c.id,
          name: c.name,
          description: c.description || '',
          prompt: c.prompt_template,
          inputFields: c.input_fields || [],
          outputField: c.output_field,
          service: hasAiModel ? 'ai' as const : 'serp' as const,
          isEnabled: true,
          createdAt: '',
          updatedAt: '',
          aiModel: hasAiModel && c.ai_model ? {
            provider: c.ai_model.provider,
            modelId: c.ai_model.model_id,
            apiKey: c.ai_model.use_env_key
              ? undefined
              : (c.ai_model.api_key_encrypted || undefined),
            baseUrl: c.ai_model.base_url || undefined,
            envKeyName: c.ai_model.env_key_name || undefined,
          } : undefined,
        };
      });
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
    setEnrichmentProgress({ completed: 0, total: processedData.length });

    await logInfo('enrich', 'Starting data enrichment', sessionId, {
      totalRows: processedData.length,
      enabledConfigs: configs.length,
    });

    try {
      // Transform rows from original CSV headers to HubSpot field names
      // so enrichment configs can find input values by HubSpot property name.
      const headerToHubspot = new Map<string, string>();
      headerMatches.forEach((match) => {
        if (match.matchedField) {
          headerToHubspot.set(match.originalHeader, match.matchedField.hubspotField);
        }
      });
      const transformedRows = processedData.map((row: Record<string, string | number | boolean | null>) => {
        const transformed: Record<string, string | number | boolean | null> = {};
        Object.entries(row).forEach(([header, value]) => {
          const hubspotField = headerToHubspot.get(header);
          if (hubspotField) {
            transformed[hubspotField] = value as string | number | boolean | null;
          }
        });
        return transformed;
      });

      // Run enrichment through the server-side API route.
      // AI API calls (OpenAI, Anthropic) require server-side env vars and
      // cannot be made from the browser due to CORS restrictions.
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: transformedRows, configs }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Enrichment request failed');
      }

      const data = await response.json();

      if (!data.success || !data.results) {
        throw new Error(data.error || 'Enrichment returned no results');
      }

      // Convert API results to EnrichmentResult format
      const results = data.results.map((r: { rowIndex: number; enrichedData: Record<string, unknown>; success: boolean; error?: string }) => ({
        rowIndex: r.rowIndex,
        originalData: processedData[r.rowIndex],
        enrichedData: r.enrichedData,
        success: r.success,
        error: r.error,
      }));

      setEnrichmentResults(results);
      setEnrichmentProgress({ completed: processedData.length, total: processedData.length });

      // Apply enrichment results back to the data
      const enrichedData = processedData.map((row, index) => {
        const result = results.find((r: { rowIndex: number }) => r.rowIndex === index);
        if (result && Object.keys(result.enrichedData).length > 0) {
          return { ...row, ...result.enrichedData };
        }
        return row;
      });
      setProcessedData(enrichedData);

      const successCount = results.filter((r: { success: boolean }) => r.success).length;
      await logSuccess('enrich', `Enrichment complete: ${successCount}/${results.length} successful`, sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logError('enrich', `Enrichment failed: ${errorMessage}`, sessionId, { error });
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
      {enrichmentResults.length > 0 && (() => {
        const successCount = enrichmentResults.filter((r) => r.success).length;
        const failedResults = enrichmentResults.filter((r) => !r.success && r.error);
        const allFailed = successCount === 0;
        // Get unique error messages
        const uniqueErrors = [...new Set(failedResults.map((r) => r.error))];

        return (
          <div className={`${allFailed ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
            <h3 className={`font-medium ${allFailed ? 'text-red-700' : 'text-green-700'} mb-2`}>
              Enrichment Complete
            </h3>
            <div className={`text-sm ${allFailed ? 'text-red-600' : 'text-green-600'}`}>
              {successCount} of {enrichmentResults.length} rows successfully enriched
            </div>
            {uniqueErrors.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-red-700">Errors:</p>
                {uniqueErrors.map((err, i) => (
                  <p key={i} className="text-sm text-red-600 bg-red-100 rounded px-2 py-1">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
