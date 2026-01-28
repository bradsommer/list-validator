import type { EnrichmentConfig, EnrichmentResult, ParsedRow } from '@/types';

// SERP API search function
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

// Extract company name from search results
function extractCompanyName(searchResults: Record<string, unknown>, inputData: Record<string, string>): string | null {
  // Try to find in knowledge graph
  const knowledgeGraph = searchResults.knowledge_graph as Record<string, unknown> | undefined;
  if (knowledgeGraph?.title) {
    return String(knowledgeGraph.title);
  }

  // Try to find in organic results
  const organicResults = searchResults.organic_results as Array<Record<string, unknown>> | undefined;
  if (organicResults && organicResults.length > 0) {
    // Look for official website or Wikipedia
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
      // Clean up the title
      let title = String(officialResult.title);
      // Remove common suffixes
      title = title.replace(/\s*[-|–]\s*.+$/, '').trim();
      title = title.replace(/\s*\|.+$/, '').trim();
      return title;
    }
  }

  return null;
}

// Extract domain from search results
function extractDomain(searchResults: Record<string, unknown>, inputData: Record<string, string>): string | null {
  const organicResults = searchResults.organic_results as Array<Record<string, unknown>> | undefined;
  if (organicResults && organicResults.length > 0) {
    // Look for official website
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

    // Fall back to first result
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

// Build search query from input fields
function buildSearchQuery(config: EnrichmentConfig, rowData: ParsedRow): string {
  const parts: string[] = [];

  config.inputFields.forEach((field) => {
    const value = rowData[field];
    if (value && String(value).trim()) {
      parts.push(String(value).trim());
    }
  });

  // Add context based on output field
  if (config.outputField === 'official_company_name') {
    parts.push('official name');
  } else if (config.outputField === 'domain') {
    parts.push('official website');
  }

  return parts.join(' ');
}

// Run a single enrichment config on a row
export async function runEnrichment(
  config: EnrichmentConfig,
  rowData: ParsedRow
): Promise<{ value: string | null; success: boolean; error?: string }> {
  if (!config.isEnabled) {
    return { value: null, success: false, error: 'Enrichment config is disabled' };
  }

  try {
    if (config.service === 'serp') {
      const query = buildSearchQuery(config, rowData);
      const searchResults = await serpSearch(query);

      if (!searchResults) {
        return { value: null, success: false, error: 'Search returned no results' };
      }

      const inputData: Record<string, string> = {};
      config.inputFields.forEach((field) => {
        inputData[field] = String(rowData[field] || '');
      });

      let value: string | null = null;

      if (config.outputField === 'official_company_name') {
        value = extractCompanyName(searchResults, inputData);
      } else if (config.outputField === 'domain') {
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
      // Skip if output field already has value
      if (row[config.outputField] && String(row[config.outputField]).trim()) {
        continue;
      }

      const result = await runEnrichment(config, row);

      if (result.success && result.value) {
        enrichedData[config.outputField] = result.value;
      } else {
        allSuccess = false;
        error = result.error;
      }

      // Rate limiting - wait between API calls
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
