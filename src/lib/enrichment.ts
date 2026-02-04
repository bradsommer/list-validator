import type { EnrichmentConfig, EnrichmentResult, ParsedRow } from '@/types';

// ============================================================================
// AI Model API Calls
// ============================================================================

// Call OpenAI-compatible API (works for OpenAI, Azure OpenAI, etc.)
async function callOpenAI(
  prompt: string,
  modelId: string,
  apiKey: string,
  baseUrl?: string
): Promise<string | null> {
  const url = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'system',
          content: 'You are a data cleaning assistant. Return ONLY the cleaned/enriched value with no extra text, explanation, or formatting. If you cannot determine the value, return the original value unchanged.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 256,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  return content || null;
}

// Call Anthropic API
async function callAnthropic(
  prompt: string,
  modelId: string,
  apiKey: string,
  baseUrl?: string
): Promise<string | null> {
  const url = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/messages`
    : 'https://api.anthropic.com/v1/messages';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are a data cleaning assistant. Return ONLY the cleaned/enriched value with no extra text, explanation, or formatting. If you cannot determine the value, return the original value unchanged.\n\n${prompt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text?.trim();
  return content || null;
}

// Route to the correct AI provider
async function callAIModel(
  prompt: string,
  provider: string,
  modelId: string,
  apiKey: string,
  baseUrl?: string
): Promise<string | null> {
  switch (provider.toLowerCase()) {
    case 'openai':
    case 'azure-openai':
      return callOpenAI(prompt, modelId, apiKey, baseUrl);
    case 'anthropic':
      return callAnthropic(prompt, modelId, apiKey, baseUrl);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Replace [shortcodes] in prompt template with actual row values
function buildPromptFromTemplate(template: string, rowData: ParsedRow, inputFields: string[]): string {
  let prompt = template;

  // Replace [fieldName] shortcodes with actual values
  for (const field of inputFields) {
    // Input fields may be in format "objectType:propertyName" — extract just the property name
    const propertyName = field.includes(':') ? field.split(':', 2)[1] : field;
    const value = rowData[propertyName];
    const valueStr = value !== null && value !== undefined ? String(value).trim() : '';
    prompt = prompt.replace(new RegExp(`\\[${propertyName}\\]`, 'g'), valueStr);
  }

  return prompt;
}

// Resolve API key from config (env var or direct key)
function resolveApiKey(aiModel: NonNullable<EnrichmentConfig['aiModel']>): string {
  if (aiModel.apiKey) return aiModel.apiKey;

  // Check the admin-configured env var name first (from ai_models.env_key_name)
  if (aiModel.envKeyName) {
    const key = process.env[aiModel.envKeyName];
    if (key) return key;
  }

  // Fall back to common env var patterns
  const provider = aiModel.provider.toLowerCase();
  const envVarNames = [
    `${provider.toUpperCase()}_API_KEY`,
    `NEXT_PUBLIC_${provider.toUpperCase()}_API_KEY`,
  ];

  for (const envVar of envVarNames) {
    const key = process.env[envVar];
    if (key) return key;
  }

  const hint = aiModel.envKeyName
    ? `Set ${aiModel.envKeyName} in .env.local`
    : `Set ${provider.toUpperCase()}_API_KEY in .env.local`;
  throw new Error(`No API key found for ${aiModel.provider}. ${hint}`);
}

// ============================================================================
// SERP API (existing functionality)
// ============================================================================

async function serpSearch(query: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) {
    throw new Error('SERP API key not configured');
  }

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`SERP API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('SERP API search error:', error);
    return null;
  }
}

function extractCompanyName(searchResults: Record<string, unknown>, inputData: Record<string, string>): string | null {
  const knowledgeGraph = searchResults.knowledge_graph as Record<string, unknown> | undefined;
  if (knowledgeGraph?.title) {
    return String(knowledgeGraph.title);
  }

  const organicResults = searchResults.organic_results as Array<Record<string, unknown>> | undefined;
  if (organicResults && organicResults.length > 0) {
    const officialResult = organicResults.find((result) => {
      const snippet = String(result.snippet || '').toLowerCase();
      const title = String(result.title || '').toLowerCase();
      const institution = inputData.institution?.toLowerCase() || '';
      return (
        snippet.includes('official') ||
        title.includes(institution) ||
        result.link?.toString().includes('.edu') ||
        result.link?.toString().includes('wikipedia')
      );
    });

    if (officialResult?.title) {
      let title = String(officialResult.title);
      title = title.replace(/\s*[-|–]\s*.+$/, '').trim();
      title = title.replace(/\s*\|.+$/, '').trim();
      return title;
    }
  }

  return null;
}

function extractDomain(searchResults: Record<string, unknown>, inputData: Record<string, string>): string | null {
  const organicResults = searchResults.organic_results as Array<Record<string, unknown>> | undefined;
  if (organicResults && organicResults.length > 0) {
    const officialResult = organicResults.find((result) => {
      const link = String(result.link || '');
      const institution = inputData.institution?.toLowerCase() || '';
      return (
        link.includes('.edu') ||
        link.includes(institution.replace(/\s+/g, '').substring(0, 10))
      );
    });

    if (officialResult?.link) {
      try {
        const url = new URL(String(officialResult.link));
        return url.hostname.replace('www.', '');
      } catch {
        return null;
      }
    }

    if (organicResults[0]?.link) {
      try {
        const url = new URL(String(organicResults[0].link));
        return url.hostname.replace('www.', '');
      } catch {
        return null;
      }
    }
  }

  return null;
}

function buildSearchQuery(config: EnrichmentConfig, rowData: ParsedRow): string {
  const parts: string[] = [];

  config.inputFields.forEach((field) => {
    const propertyName = field.includes(':') ? field.split(':', 2)[1] : field;
    const value = rowData[propertyName];
    if (value && String(value).trim()) {
      parts.push(String(value).trim());
    }
  });

  if (config.outputField === 'official_company_name') {
    parts.push('official name');
  } else if (config.outputField === 'domain') {
    parts.push('official website');
  }

  return parts.join(' ');
}

// ============================================================================
// Main Enrichment Functions
// ============================================================================

// Run a single enrichment config on a row
export async function runEnrichment(
  config: EnrichmentConfig,
  rowData: ParsedRow
): Promise<{ value: string | null; success: boolean; error?: string }> {
  if (!config.isEnabled) {
    return { value: null, success: false, error: 'Enrichment config is disabled' };
  }

  try {
    // AI model enrichment — use the configured AI provider
    if (config.service === 'ai' && config.aiModel) {
      const apiKey = resolveApiKey(config.aiModel);
      const prompt = buildPromptFromTemplate(config.prompt, rowData, config.inputFields);

      const value = await callAIModel(
        prompt,
        config.aiModel.provider,
        config.aiModel.modelId,
        apiKey,
        config.aiModel.baseUrl
      );

      return {
        value,
        success: value !== null,
        error: value ? undefined : 'AI model returned empty response',
      };
    }

    // SERP API enrichment — existing search-based logic
    if (config.service === 'serp') {
      const query = buildSearchQuery(config, rowData);
      const searchResults = await serpSearch(query);

      if (!searchResults) {
        return { value: null, success: false, error: 'Search returned no results' };
      }

      const inputData: Record<string, string> = {};
      config.inputFields.forEach((field) => {
        const propertyName = field.includes(':') ? field.split(':', 2)[1] : field;
        inputData[propertyName] = String(rowData[propertyName] || '');
      });

      let value: string | null = null;

      // Try to parse output field for the field ID
      let outputFieldId = config.outputField;
      try {
        const parsed = JSON.parse(config.outputField);
        if (Array.isArray(parsed) && parsed.length > 0) {
          outputFieldId = parsed[0].id;
        }
      } catch {
        // Legacy single string
      }

      if (outputFieldId === 'official_company_name') {
        value = extractCompanyName(searchResults, inputData);
      } else if (outputFieldId === 'domain') {
        value = extractDomain(searchResults, inputData);
      }

      return {
        value,
        success: value !== null,
        error: value ? undefined : 'Could not extract value from search results',
      };
    }

    return { value: null, success: false, error: `Unsupported service: ${config.service}` };
  } catch (error) {
    return {
      value: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Run all enabled enrichments on all rows
export async function enrichData(
  rows: ParsedRow[],
  configs: EnrichmentConfig[],
  onProgress?: (completed: number, total: number) => void
): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = [];
  const enabledConfigs = configs.filter((c) => c.isEnabled);
  const total = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const enrichedData: Partial<ParsedRow> = {};
    let allSuccess = true;
    let error: string | undefined;

    for (const config of enabledConfigs) {
      // Parse output field IDs
      let outputFieldIds: string[] = [];
      try {
        const parsed = JSON.parse(config.outputField);
        if (Array.isArray(parsed)) {
          outputFieldIds = parsed.map((f: { id: string }) => f.id);
        }
      } catch {
        outputFieldIds = [config.outputField];
      }

      // Skip if all output fields already have values
      const allHaveValues = outputFieldIds.every(
        (id) => row[id] && String(row[id]).trim()
      );
      if (allHaveValues) {
        continue;
      }

      const result = await runEnrichment(config, row);

      if (result.success && result.value) {
        // Store the result in the first output field
        if (outputFieldIds.length > 0) {
          enrichedData[outputFieldIds[0]] = result.value;
        } else {
          enrichedData[config.outputField] = result.value;
        }
      } else {
        allSuccess = false;
        error = result.error;
      }

      // Rate limiting — wait between API calls
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    results.push({
      rowIndex: i,
      originalData: row,
      enrichedData,
      success: allSuccess,
      error,
    });

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
}

// Apply enrichment results back to the data
export function applyEnrichmentResults(
  rows: ParsedRow[],
  results: EnrichmentResult[]
): ParsedRow[] {
  return rows.map((row, index) => {
    const result = results.find((r) => r.rowIndex === index);
    if (result && Object.keys(result.enrichedData).length > 0) {
      return { ...row, ...result.enrichedData };
    }
    return row;
  });
}

// Default enrichment configurations
export const defaultEnrichmentConfigs: Omit<EnrichmentConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Find Official Company Name',
    description: 'Use SERP API to find the official company/institution name',
    prompt: 'Given a user\'s email address, city, state, and institution, find the official company name',
    inputFields: ['email', 'city', 'state', 'institution'],
    outputField: 'official_company_name',
    service: 'serp',
    isEnabled: true,
  },
  {
    name: 'Find Company Domain',
    description: 'Use SERP API to find the company/institution domain',
    prompt: 'Given a user\'s email address, city, state, and institution, find the company domain',
    inputFields: ['email', 'city', 'state', 'institution'],
    outputField: 'domain',
    service: 'serp',
    isEnabled: true,
  },
];
