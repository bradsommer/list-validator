import { Client } from '@hubspot/api-client';
import type { HubSpotCompany, HubSpotContact, HubSpotMatchResult } from '@/types';
import { fuzzyMatchCompanyName } from './fuzzyMatcher';
import { cache, CACHE_TTL, CACHE_KEYS } from './cache';

// ============================================================================
// HubSpot OAuth
// ============================================================================

const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize';
const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';

export function getHubSpotClientId(): string {
  return process.env.HUBSPOT_CLIENT_ID || '';
}

export function getHubSpotClientSecret(): string {
  return process.env.HUBSPOT_CLIENT_SECRET || '';
}

export function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/api/hubspot/oauth/callback`;
}

export function getAuthorizeUrl(accountId?: string): string {
  const clientId = getHubSpotClientId();
  const redirectUri = getRedirectUri();
  const scopes = [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.companies.read',
    'crm.objects.companies.write',
    'crm.objects.deals.read',
    'crm.objects.deals.write',
    'crm.objects.marketing_events.read',
    'crm.objects.marketing_events.write',
    'crm.schemas.contacts.read',
    'crm.schemas.contacts.write',
    'crm.schemas.companies.read',
    'crm.schemas.companies.write',
    'crm.schemas.deals.read',
    'crm.schemas.deals.write',
    'crm.dealsplits.read_write',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: 'code',
  });

  // Pass account_id as state so callback can associate with the right account
  if (accountId) {
    params.set('state', accountId);
  }

  return `${HUBSPOT_AUTH_URL}?${params.toString()}`;
}

export interface HubSpotTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
}

export async function exchangeCodeForTokens(code: string): Promise<HubSpotTokens> {
  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: getHubSpotClientId(),
      client_secret: getHubSpotClientSecret(),
      redirect_uri: getRedirectUri(),
      code,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('HubSpot token exchange error:', error);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<HubSpotTokens> {
  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: getHubSpotClientId(),
      client_secret: getHubSpotClientSecret(),
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('HubSpot token refresh error:', error);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

// Token persistence - Supabase as primary, file as fallback
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '@/lib/supabase';

const TOKEN_FILE = path.join(process.cwd(), '.hubspot-tokens.json');
const DEFAULT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

// --- File-based fallback ---

function saveTokensToFile(tokens: HubSpotTokens | null) {
  try {
    if (tokens) {
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
    } else {
      if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
    }
  } catch {
    // Silently fail
  }
}

function loadTokensFromFile(): HubSpotTokens | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    }
  } catch {
    // Silently fail
  }
  return null;
}

// --- Supabase storage ---

async function saveTokensToDb(tokens: HubSpotTokens, accountId: string, portalId?: string): Promise<boolean> {
  try {
    const upsertData: Record<string, unknown> = {
      account_id: accountId,
      provider: 'hubspot',
      is_active: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expires_at,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (portalId) {
      upsertData.portal_id = portalId;
    }
    const { error } = await supabase
      .from('account_integrations')
      .upsert(upsertData, {
        onConflict: 'account_id,provider',
      });
    if (error) {
      console.error('Failed to save tokens to DB:', error.message);
      return false;
    }
    console.log('Tokens saved to DB successfully (portal_id:', portalId || 'none', ')');
    return true;
  } catch (err) {
    console.error('Exception saving tokens to DB:', err);
    return false;
  }
}

async function loadTokensFromDb(accountId: string): Promise<HubSpotTokens | null> {
  try {
    const { data, error } = await supabase
      .from('account_integrations')
      .select('access_token, refresh_token, token_expires_at')
      .eq('account_id', accountId)
      .eq('provider', 'hubspot')
      .eq('is_active', true)
      .single();

    if (error || !data?.access_token) return null;

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: 0,
      expires_at: data.token_expires_at || 0,
    };
  } catch {
    return null;
  }
}

export async function getPortalId(accountId?: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('account_integrations')
      .select('portal_id')
      .eq('account_id', accountId || DEFAULT_ACCOUNT_ID)
      .eq('provider', 'hubspot')
      .eq('is_active', true)
      .single();

    if (error || !data?.portal_id) return null;
    return data.portal_id;
  } catch {
    return null;
  }
}

async function clearTokensFromDb(accountId: string): Promise<void> {
  try {
    await supabase
      .from('account_integrations')
      .delete()
      .eq('account_id', accountId)
      .eq('provider', 'hubspot');
  } catch {
    // Silently fail
  }
}

// --- Combined token management (in-memory + DB + file) ---

let storedTokens: HubSpotTokens | null = null;

export async function setTokens(tokens: HubSpotTokens, accountId?: string, portalId?: string) {
  storedTokens = tokens;
  saveTokensToFile(tokens);
  await saveTokensToDb(tokens, accountId || DEFAULT_ACCOUNT_ID, portalId);
}

export async function getTokens(accountId?: string): Promise<HubSpotTokens | null> {
  if (storedTokens) return storedTokens;

  // Try database first
  const dbTokens = await loadTokensFromDb(accountId || DEFAULT_ACCOUNT_ID);
  if (dbTokens) {
    storedTokens = dbTokens;
    return dbTokens;
  }

  // Fall back to file
  const fileTokens = loadTokensFromFile();
  if (fileTokens) {
    storedTokens = fileTokens;
    return fileTokens;
  }

  return null;
}

export async function clearTokens(accountId?: string) {
  storedTokens = null;
  hubspotClient = null;
  hubspotClientToken = null;
  saveTokensToFile(null);
  await clearTokensFromDb(accountId || DEFAULT_ACCOUNT_ID);
}

export async function getValidAccessToken(): Promise<string | null> {
  // First check for env var fallback
  if (process.env.HUBSPOT_ACCESS_TOKEN) {
    return process.env.HUBSPOT_ACCESS_TOKEN;
  }

  // Always check DB for the latest tokens — the in-memory cache may be stale
  // if the user re-authenticated in another request or the token was refreshed.
  const dbTokens = await loadTokensFromDb(DEFAULT_ACCOUNT_ID);
  if (dbTokens) {
    storedTokens = dbTokens;
  }

  let tokens = storedTokens || await getTokens();
  if (!tokens) return null;

  // Refresh if expired (with 5 min buffer)
  if (Date.now() > tokens.expires_at - 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      await setTokens(refreshed);
      tokens = refreshed;
      // Reset the cached client so it picks up the new token
      hubspotClient = null;
      hubspotClientToken = null;
    } catch (refreshErr) {
      console.error('Token refresh failed, re-reading DB for possibly re-authed tokens:', refreshErr);
      // Don't clear tokens — the user may have re-authenticated and the DB
      // has fresh tokens. Re-read from DB as a last resort.
      const freshDbTokens = await loadTokensFromDb(DEFAULT_ACCOUNT_ID);
      if (freshDbTokens && freshDbTokens.access_token !== tokens.access_token) {
        // DB has different tokens — use them (likely from a re-auth)
        storedTokens = freshDbTokens;
        hubspotClient = null;
        hubspotClientToken = null;
        return freshDbTokens.access_token;
      }
      // DB has the same expired token — nothing we can do
      return null;
    }
  }

  return tokens.access_token;
}

export async function isConnected(): Promise<boolean> {
  if (process.env.HUBSPOT_ACCESS_TOKEN) return true;
  const tokens = await getTokens();
  return !!tokens;
}

// ============================================================================
// HubSpot Client
// ============================================================================

let hubspotClient: Client | null = null;
let hubspotClientToken: string | null = null;

export async function getHubSpotClient(): Promise<Client> {
  // Always get a valid token first — this handles refresh and DB re-reads.
  // If the token changed (due to refresh or re-auth), recreate the client.
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('HubSpot not connected. Please connect via OAuth in Admin settings.');
  }

  if (!hubspotClient || hubspotClientToken !== accessToken) {
    hubspotClient = new Client({ accessToken });
    hubspotClientToken = accessToken;
  }
  return hubspotClient;
}

// Reset client when tokens change
export function resetClient() {
  hubspotClient = null;
  hubspotClientToken = null;
}

// Search for companies by domain (cached during sync batches)
export async function searchCompaniesByDomain(domain: string): Promise<HubSpotCompany[]> {
  const cacheKey = CACHE_KEYS.companyDomain(domain);
  const cached = cache.get<HubSpotCompany[]>(cacheKey);
  if (cached) return cached;

  const client = await getHubSpotClient();

  try {
    const response = await client.crm.companies.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'domain',
              operator: 'CONTAINS_TOKEN',
              value: domain,
            },
          ],
        },
      ],
      properties: ['name', 'domain', 'city', 'state'],
      limit: 10,
    });

    const results = response.results.map((company) => ({
      id: company.id,
      name: company.properties.name || '',
      domain: company.properties.domain || '',
      city: company.properties.city,
      state: company.properties.state,
      properties: company.properties,
    }));

    cache.set(cacheKey, results, CACHE_TTL.COMPANY_SEARCH);
    return results;
  } catch (error) {
    console.error('Error searching companies by domain:', error);
    return [];
  }
}

// Search for companies by name (cached during sync batches)
export async function searchCompaniesByName(name: string): Promise<HubSpotCompany[]> {
  const cacheKey = CACHE_KEYS.companyName(name);
  const cached = cache.get<HubSpotCompany[]>(cacheKey);
  if (cached) return cached;

  const client = await getHubSpotClient();

  try {
    const response = await client.crm.companies.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'name',
              operator: 'CONTAINS_TOKEN',
              value: name,
            },
          ],
        },
      ],
      properties: ['name', 'domain', 'city', 'state'],
      limit: 10,
    });

    const results = response.results.map((company) => ({
      id: company.id,
      name: company.properties.name || '',
      domain: company.properties.domain || '',
      city: company.properties.city,
      state: company.properties.state,
      properties: company.properties,
    }));

    cache.set(cacheKey, results, CACHE_TTL.COMPANY_SEARCH);
    return results;
  } catch (error) {
    console.error('Error searching companies by name:', error);
    return [];
  }
}

// Find the best matching company for a contact
export async function findBestCompanyMatch(
  contactData: {
    email?: string;
    institution?: string;
    officialName?: string;
    domain?: string;
    city?: string;
    state?: string;
  }
): Promise<{ company: HubSpotCompany | null; matchType: 'exact_domain' | 'fuzzy_name' | 'no_match'; confidence: number }> {

  // First, try exact domain match
  if (contactData.domain) {
    const domainMatches = await searchCompaniesByDomain(contactData.domain);
    if (domainMatches.length > 0) {
      return {
        company: domainMatches[0],
        matchType: 'exact_domain',
        confidence: 1,
      };
    }
  }

  // Try to extract domain from email
  if (contactData.email) {
    const emailDomain = contactData.email.split('@')[1];
    if (emailDomain && !emailDomain.includes('gmail') && !emailDomain.includes('yahoo') && !emailDomain.includes('hotmail')) {
      const domainMatches = await searchCompaniesByDomain(emailDomain);
      if (domainMatches.length > 0) {
        return {
          company: domainMatches[0],
          matchType: 'exact_domain',
          confidence: 0.9,
        };
      }
    }
  }

  // Try fuzzy name match with official name or institution
  const searchName = contactData.officialName || contactData.institution;
  if (searchName) {
    const nameMatches = await searchCompaniesByName(searchName);
    if (nameMatches.length > 0) {
      const fuzzyResult = fuzzyMatchCompanyName(
        searchName,
        nameMatches.map((c) => ({ id: c.id, name: c.name }))
      );

      if (fuzzyResult.company && fuzzyResult.confidence >= 0.7) {
        const matchedCompany = nameMatches.find((c) => c.id === fuzzyResult.company!.id);
        return {
          company: matchedCompany || null,
          matchType: 'fuzzy_name',
          confidence: fuzzyResult.confidence,
        };
      }
    }
  }

  return { company: null, matchType: 'no_match', confidence: 0 };
}

// Create a new company in HubSpot
export async function createCompany(companyData: {
  name: string;
  domain?: string;
  city?: string;
  state?: string;
}): Promise<HubSpotCompany> {
  const client = await getHubSpotClient();

  const properties: Record<string, string> = {
    name: companyData.name,
  };

  if (companyData.domain) properties.domain = companyData.domain;
  if (companyData.city) properties.city = companyData.city;
  if (companyData.state) properties.state = companyData.state;

  const response = await client.crm.companies.basicApi.create({
    properties,
  });

  const newCompany: HubSpotCompany = {
    id: response.id,
    name: response.properties.name || '',
    domain: response.properties.domain || '',
    city: response.properties.city,
    state: response.properties.state,
    properties: response.properties,
  };

  // Cache the new company so subsequent contacts with same domain/name find it
  if (companyData.domain) {
    cache.set(CACHE_KEYS.companyDomain(companyData.domain), [newCompany], CACHE_TTL.COMPANY_SEARCH);
  }
  if (companyData.name) {
    cache.set(CACHE_KEYS.companyName(companyData.name), [newCompany], CACHE_TTL.COMPANY_SEARCH);
  }

  return newCompany;
}

// Create or update a contact in HubSpot
// Accepts a flat object of HubSpot property names → values
export async function createOrUpdateContact(
  properties: Record<string, string>
): Promise<HubSpotContact> {
  const client = await getHubSpotClient();

  // Filter out empty values
  const cleanProperties: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value && value.trim()) {
      cleanProperties[key] = value.trim();
    }
  }

  if (!cleanProperties.email) {
    throw new Error('Email is required to create a HubSpot contact');
  }

  try {
    const response = await client.crm.contacts.basicApi.create({
      properties: cleanProperties,
    });

    return {
      id: response.id,
      email: response.properties.email || '',
      firstName: response.properties.firstname,
      lastName: response.properties.lastname,
      company: response.properties.company,
      properties: response.properties,
    };
  } catch (error: unknown) {
    // If contact exists, update it
    if (error && typeof error === 'object' && 'code' in error && error.code === 409) {
      const searchResponse = await client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: cleanProperties.email,
              },
            ],
          },
        ],
        properties: ['email', 'firstname', 'lastname', 'company'],
        limit: 1,
      });

      if (searchResponse.results.length > 0) {
        const existingContact = searchResponse.results[0];
        const updateResponse = await client.crm.contacts.basicApi.update(
          existingContact.id,
          { properties: cleanProperties }
        );

        return {
          id: updateResponse.id,
          email: updateResponse.properties.email || '',
          firstName: updateResponse.properties.firstname,
          lastName: updateResponse.properties.lastname,
          company: updateResponse.properties.company,
          properties: updateResponse.properties,
        };
      }
    }
    throw error;
  }
}

// Associate a contact with a company
export async function associateContactWithCompany(
  contactId: string,
  companyId: string
): Promise<void> {
  const client = await getHubSpotClient();

  await client.crm.associations.v4.basicApi.create(
    'contacts',
    contactId,
    'companies',
    companyId,
    [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
  );
}

// Create a task in HubSpot
export async function createTask(taskData: {
  subject: string;
  body: string;
  ownerId: string;
  dueDate?: Date;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  associatedContactId?: string;
  associatedCompanyId?: string;
}): Promise<string> {
  const client = await getHubSpotClient();

  const properties: Record<string, string> = {
    hs_task_subject: taskData.subject,
    hs_task_body: taskData.body,
    hubspot_owner_id: taskData.ownerId,
    hs_task_status: 'NOT_STARTED',
    hs_task_priority: taskData.priority || 'MEDIUM',
  };

  if (taskData.dueDate) {
    properties.hs_timestamp = taskData.dueDate.getTime().toString();
  }

  const response = await client.crm.objects.basicApi.create('tasks', {
    properties,
  });

  // Associate task with contact and/or company
  if (taskData.associatedContactId) {
    await client.crm.associations.v4.basicApi.create(
      'tasks',
      response.id,
      'contacts',
      taskData.associatedContactId,
      [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }]
    );
  }

  if (taskData.associatedCompanyId) {
    await client.crm.associations.v4.basicApi.create(
      'tasks',
      response.id,
      'companies',
      taskData.associatedCompanyId,
      [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 192 }]
    );
  }

  return response.id;
}

// Get HubSpot owners (for task assignment dropdown)
export async function getHubSpotOwners(): Promise<{ id: string; email: string; name: string }[]> {
  const client = await getHubSpotClient();

  const response = await client.crm.owners.ownersApi.getPage();

  return response.results.map((owner) => ({
    id: owner.id,
    email: owner.email || '',
    name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim(),
  }));
}

// Update an existing company's properties
export async function updateCompany(
  companyId: string,
  properties: Record<string, string>
): Promise<void> {
  const client = await getHubSpotClient();

  // Filter out empty values
  const cleanProperties: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value && value.trim()) {
      cleanProperties[key] = value.trim();
    }
  }

  if (Object.keys(cleanProperties).length === 0) return;

  await client.crm.companies.basicApi.update(companyId, { properties: cleanProperties });
}

// Process a single row for HubSpot sync.
// contactProps: HubSpot contact property names -> values
// companyProps: HubSpot company property names -> values
// These are separated by the client so we can:
// - Use company properties (domain, name, city, state) for company matching/creation
// - Use contact properties (email, firstname, etc.) for contact creation/update
// - Avoid sending company properties as contact properties (which HubSpot rejects)
export async function processRowForHubSpot(
  rowIndex: number,
  contactProps: Record<string, string>,
  companyProps: Record<string, string>,
  defaultTaskAssigneeId: string
): Promise<HubSpotMatchResult> {
  // Email comes from contact properties
  const email = contactProps.email || '';

  // Company info comes from company properties first, with contact fallbacks
  const companyName = companyProps.name || companyProps.company || contactProps.company || '';
  const domain = companyProps.domain || companyProps.website || contactProps.website || '';
  const city = companyProps.city || contactProps.city || '';
  const state = companyProps.state || contactProps.state || '';

  // Find best company match
  const matchResult = await findBestCompanyMatch({
    email,
    institution: companyName,
    officialName: companyName,
    domain,
    city,
    state,
  });

  let company = matchResult.company;
  let matchType = matchResult.matchType;
  let taskCreated = false;
  let taskId: string | undefined;

  if (company) {
    // Update existing company with any new property values from this row
    try {
      await updateCompany(company.id, companyProps);
    } catch (err) {
      console.error(`Failed to update company ${company.id}:`, err);
    }
  } else if (companyName) {
    // No match found — create new company and task
    company = await createCompany({
      name: companyName,
      domain,
      city,
      state,
    });
    matchType = 'created_new';

    // Create task for new company if assignee is set
    if (defaultTaskAssigneeId) {
      taskId = await createTask({
        subject: `Review new company: ${company.name}`,
        body: `A new company was created during list import.\n\nCompany: ${company.name}\nDomain: ${domain || 'N/A'}\nCity: ${city || 'N/A'}\nState: ${state || 'N/A'}\n\nPlease review and verify the company information.`,
        ownerId: defaultTaskAssigneeId,
        priority: 'MEDIUM',
        associatedCompanyId: company.id,
      });
      taskCreated = true;
    }
  }

  // Create or update the contact with ONLY contact properties (matched on email)
  const contact = await createOrUpdateContact(contactProps);

  // Associate contact with company
  if (company) {
    await associateContactWithCompany(contact.id, company.id);
  }

  return {
    rowIndex,
    contact,
    matchedCompany: company,
    matchConfidence: matchResult.confidence,
    matchType: matchType as 'exact_domain' | 'fuzzy_name' | 'created_new' | 'no_match',
    taskCreated,
    taskId,
  };
}
