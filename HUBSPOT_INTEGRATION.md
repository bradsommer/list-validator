# HubSpot Integration — Architecture & Configuration Reference

This document describes exactly how the HubSpot integration works in FreshSegments. Use it as a blueprint when configuring new OAuth-based integrations.

---

## 1. Prerequisites

### Environment Variables

| Variable | Required | Where | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Server + Client | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Server + Client | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Bypasses RLS for token read/write. **If missing, token persistence will fail silently.** |
| `NEXT_PUBLIC_APP_URL` | Yes | Server + Client | Base URL (e.g. `https://app.freshsegments.com`). Used to build the OAuth redirect URI. |
| `HUBSPOT_CLIENT_ID` | Optional | Server | OAuth Client ID. Can also be stored in `app_settings` table. |
| `HUBSPOT_CLIENT_SECRET` | Optional | Server | OAuth Client Secret. Can also be stored in `app_settings` table. |
| `HUBSPOT_ACCESS_TOKEN` | Optional | Server | Static fallback token (bypasses OAuth entirely). For testing only. |

OAuth credentials are resolved in this order:
1. Environment variable (`HUBSPOT_CLIENT_ID` / `HUBSPOT_CLIENT_SECRET`)
2. Database lookup (`app_settings` table, keys: `hubspot_client_id`, `hubspot_client_secret`)

### Database Tables

Three tables must exist in Supabase. They are created by:
```
supabase/migrations/20260307_restore_account_integrations_app_settings.sql
```

**After running the migration, reload PostgREST's schema cache:**
```sql
NOTIFY pgrst, 'reload schema';
```

#### `account_integrations`
Stores OAuth tokens per account. This is the source of truth for connection state.

| Column | Type | Purpose |
|---|---|---|
| `account_id` | UUID (FK → accounts) | The account that owns this integration |
| `provider` | VARCHAR | Always `'hubspot'` for this integration |
| `is_active` | BOOLEAN | Whether the integration is active |
| `access_token` | TEXT | HubSpot OAuth access token |
| `refresh_token` | TEXT | HubSpot OAuth refresh token |
| `token_expires_at` | BIGINT | Expiry as Unix timestamp (ms) |
| `portal_id` | VARCHAR | HubSpot Hub ID |
| `connected_at` | TIMESTAMPTZ | When the connection was established |

Unique constraint: `(account_id, provider)` — enables upsert on reconnect.

#### `app_settings`
Stores global OAuth credentials (alternative to env vars).

| Key | Value (JSONB) | Purpose |
|---|---|---|
| `hubspot_client_id` | `"abc123"` | OAuth Client ID |
| `hubspot_client_secret` | `"secret"` | OAuth Client Secret |

#### `hubspot_properties`
Caches HubSpot property definitions fetched via the API. Populated by Re-Sync.

| Column | Purpose |
|---|---|
| `account_id` | Owner account |
| `field_name` | HubSpot internal property name |
| `field_label` | Human-readable label |
| `object_type` | `contacts`, `companies`, or `deals` |

#### RLS Policies
All three tables have permissive RLS policies for both `authenticated` and `anon` roles. The server uses the service-role client which bypasses RLS entirely.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Frontend (integrations/page.tsx)                    │
│  - Connect button → opens OAuth popup               │
│  - Re-Sync button → POST /api/hubspot/properties    │
│  - Disconnect button → DELETE /api/hubspot/oauth     │
│  - Listens for postMessage from popup                │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│  API Routes                                          │
│  /api/hubspot/oauth          GET    Connection status │
│  /api/hubspot/oauth          DELETE Disconnect        │
│  /api/hubspot/oauth/connect  POST   Start OAuth flow  │
│  /api/hubspot/oauth/callback GET    OAuth callback     │
│  /api/hubspot/properties     GET    Read cached props  │
│  /api/hubspot/properties     POST   Fetch+store props  │
│  /api/hubspot/sync-headings  POST   Props→headings     │
│  /api/hubspot/sync           POST   Contact/company    │
│  /api/hubspot/owners         GET    Task assignees      │
│  /api/integrations           GET    List integrations   │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│  Core Library (src/lib/hubspot.ts)                   │
│  - Token management (get/set/refresh/clear)          │
│  - Per-account in-memory cache + DB persistence      │
│  - HubSpot API client (@hubspot/api-client)          │
│  - Company/contact CRUD operations                   │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│  Supabase (persistent state)                         │
│  - account_integrations (tokens)                     │
│  - app_settings (OAuth credentials)                  │
│  - hubspot_properties (cached property definitions)  │
└─────────────────────────────────────────────────────┘
```

---

## 3. OAuth Flow (Connect)

### Step-by-step:

1. **User clicks "Connect"** on `/admin/integrations`
2. **Frontend** calls `POST /api/hubspot/oauth/connect` with `x-account-id` header
3. **Connect route** revokes any existing refresh token at HubSpot (forces full consent), then returns a fresh `authorizeUrl` with `state=accountId`
4. **Frontend** opens the authorize URL in a **popup window** (600x700)
5. **User completes HubSpot's consent flow** (two screens for unapproved apps)
6. **HubSpot redirects** to `GET /api/hubspot/oauth/callback?code=xxx&state=accountId`
7. **Callback route**:
   a. Exchanges code for tokens via `POST https://api.hubapi.com/oauth/v1/token`
   b. Fetches token info to get `hub_id` (portal ID) and verify scopes
   c. If required CRM scopes are missing → revokes partial token, returns error
   d. Calls `setTokens(tokens, accountId, portalId)` → saves to in-memory cache AND database
   e. **Verifies persistence** — if DB save failed, returns error to popup
   f. Auto-fetches HubSpot properties and syncs as column headings
   g. Returns HTML page that `postMessage`s `{success: true}` to opener and closes
8. **Frontend** receives the postMessage, shows success toast, refreshes connection status

### Key design decisions:
- **Popup-based OAuth** avoids losing page state during redirects
- **`state` parameter** carries `accountId` through the OAuth flow so the callback saves tokens under the correct account
- **Scope verification** catches the unapproved-app two-screen issue where only the first screen is completed
- **Token persistence is verified** — the callback fails if tokens can't be saved to DB, preventing false "connected" state

---

## 4. Token Storage & Retrieval

### Two-tier storage:
1. **In-memory cache** (`tokenCache` Map, keyed by accountId) — fast, but lost on server restart
2. **Database** (`account_integrations` table) — persistent, survives deployments

### Write path (`setTokens`):
1. Set in-memory cache immediately
2. Upsert to `account_integrations` (on conflict: `account_id, provider`)
3. Verify write by reading it back
4. If save fails, retry once after 1 second
5. Return `{ persisted: boolean }` so callers know if DB save succeeded

### Read path (`getValidAccessToken`):
1. Check `HUBSPOT_ACCESS_TOKEN` env var (testing fallback)
2. Load from database via `loadTokensFromDb` (always hits DB, not cache, to avoid stale tokens)
3. Check expiry with 5-minute buffer
4. If expired → refresh via HubSpot API → save new tokens
5. If refresh fails → re-read DB as last resort (another request may have refreshed)
6. Final safety guard: never return a known-expired token

### Token refresh:
- Tokens expire every 30 minutes (HubSpot default)
- Refresh happens automatically in `getValidAccessToken` with a 5-minute buffer
- Uses `refresh_token` grant type against HubSpot's token endpoint
- New tokens are saved to both in-memory cache and DB

---

## 5. Connection Status Check

`GET /api/hubspot/oauth` with `x-account-id` header.

1. Check per-account memory cache (1-minute TTL)
2. If cache miss → `isConnected(accountId)` → `getTokens()` → checks DB
3. Cache result for 1 minute
4. Return `{ connected, portalId, expiresAt, authorizeUrl }`

The `authorizeUrl` is only generated when not connected and OAuth credentials are configured.

---

## 6. Re-Sync Flow

When user clicks "Re-Sync":

1. `POST /api/hubspot/properties` — fetches all contact, company, and deal properties from HubSpot API, stores in `hubspot_properties` table
2. `POST /api/hubspot/sync-headings` — reads `hubspot_properties` and syncs them into the `column_headings` table for use in data mapping

If token retrieval fails, the re-sync now provides specific diagnostics:
- No integration row found → "Please reconnect"
- Row exists but `is_active=false` → "Integration is inactive"
- Row exists but token expired and refresh failed → "Please reconnect"
- DB query failed → Shows the database error message

---

## 7. Disconnect Flow

`DELETE /api/hubspot/oauth` with `x-account-id` header:

1. Uninstalls the app from the HubSpot portal (`DELETE /appinstalls/v3/external-install`)
2. Revokes the refresh token at HubSpot
3. Clears local tokens (in-memory + DB row deleted)
4. Removes all HubSpot-sourced column headings
5. Invalidates connection and owners caches

---

## 8. Deployment Resilience

### What survives a deployment:
- OAuth tokens (stored in Supabase `account_integrations`)
- OAuth credentials (stored in Supabase `app_settings` or env vars)
- Cached HubSpot properties (stored in Supabase `hubspot_properties`)

### What resets on deployment:
- In-memory caches (`tokenCache`, `portalIdCache`, `clientCache`, connection status cache)
- These are repopulated automatically from DB on first access

### Critical requirements:
1. `SUPABASE_SERVICE_ROLE_KEY` must be set in the deployment environment
2. The three database tables must exist (run the migration if they don't)
3. After schema changes, run `NOTIFY pgrst, 'reload schema'` so PostgREST picks up new tables
4. `NEXT_PUBLIC_APP_URL` must match the production URL (used for OAuth redirect URI)

### Next.js fetch caching:
The Supabase client disables Next.js 14's fetch caching (`cache: 'no-store'` on every request). Without this, PostgREST GET responses get cached and token writes become invisible to subsequent reads.

---

## 9. File Inventory

### Core library:
- `src/lib/hubspot.ts` — OAuth, token management, HubSpot API client, all CRM operations
- `src/lib/supabase.ts` — Supabase client (anon + service-role singleton, fetch caching disabled)
- `src/lib/cache.ts` — In-memory cache with TTL (per-account keys)
- `src/lib/columnHeadings.ts` — Syncs HubSpot properties to column_headings table

### API routes:
- `src/app/api/hubspot/oauth/route.ts` — GET (connection status), DELETE (disconnect)
- `src/app/api/hubspot/oauth/connect/route.ts` — POST (start OAuth flow)
- `src/app/api/hubspot/oauth/callback/route.ts` — GET (OAuth callback)
- `src/app/api/hubspot/properties/route.ts` — GET/POST (read/fetch HubSpot properties)
- `src/app/api/hubspot/sync-headings/route.ts` — POST (sync properties → column headings)
- `src/app/api/hubspot/sync/route.ts` — POST (streaming contact/company sync)
- `src/app/api/hubspot/owners/route.ts` — GET (HubSpot owners for task assignment)
- `src/app/api/integrations/route.ts` — GET/DELETE (list/remove integrations)

### Frontend:
- `src/app/admin/integrations/page.tsx` — Connect/Disconnect/Re-Sync UI
- `src/components/hubspot/HubSpotSync.tsx` — Contact/company sync UI with progress

### Database:
- `supabase/migrations/20260307_restore_account_integrations_app_settings.sql` — Creates all three tables

---

## 10. Checklist for Adding a New Integration

Based on the HubSpot integration pattern, here's what you need for any new OAuth integration:

1. **Database**: Add a row pattern to `account_integrations` with the new `provider` name (the table is provider-agnostic)
2. **OAuth credentials**: Store client ID/secret in env vars or `app_settings` table
3. **Token management**: Add `getValidAccessToken`-style function that reads from DB, refreshes if expired, verifies writes
4. **API routes**:
   - `GET /api/{provider}/oauth` — connection status
   - `POST /api/{provider}/oauth/connect` — start OAuth flow
   - `GET /api/{provider}/oauth/callback` — handle callback, save tokens, **verify persistence**
   - `DELETE /api/{provider}/oauth` — disconnect
5. **Frontend**: Add to `AVAILABLE_INTEGRATIONS` array in `src/app/admin/integrations/page.tsx`
6. **Supabase client**: Always use `getServerSupabase()` (service-role) for token operations
7. **Caching**: Use per-account cache keys, disable Next.js fetch caching
8. **Error handling**: Verify DB writes, provide diagnostic errors, never report "connected" if tokens weren't persisted

### Common pitfalls to avoid:
- **Don't rely on in-memory state alone** — serverless functions don't share memory across invocations
- **Don't report success before verifying DB persistence** — the callback must confirm tokens are saved
- **Don't use the anon Supabase client for token operations** — use service-role to bypass RLS
- **Don't forget `NOTIFY pgrst, 'reload schema'`** after creating new tables
- **Don't cache empty/failed results** — a transient DB failure shouldn't poison the cache for minutes
