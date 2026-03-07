# OAuth Integration Architecture Prompt

Use this prompt when building a new third-party OAuth integration (e.g., Salesforce, Mailchimp, Google Workspace) in a Next.js + Supabase application deployed on Vercel (or any serverless platform).

---

## Prompt

I need to build a [PROVIDER_NAME] OAuth integration for my Next.js app with Supabase as the database, deployed on a serverless platform (Vercel). The integration needs to survive deployments, serverless cold starts, and token expiration gracefully.

Here are the architectural requirements based on lessons learned from production issues:

---

### 1. Database Schema

Create these tables. All tables must have RLS enabled with policies for both `authenticated` and `anon` roles, plus `service_role` bypass for server-side operations.

#### `app_settings` — Store OAuth credentials (client ID, client secret)
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON app_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for anon" ON app_settings FOR ALL TO anon USING (true);
```

Store credentials as rows: `{provider}_client_id`, `{provider}_client_secret`, `{provider}_app_id`.

#### `account_integrations` — Store per-account OAuth tokens
```sql
CREATE TABLE IF NOT EXISTS account_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at BIGINT,  -- Unix timestamp in milliseconds
  portal_id VARCHAR(255),   -- Provider-specific account/org ID
  metadata JSONB DEFAULT '{}',
  connected_by UUID REFERENCES users(id),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, provider)
);

ALTER TABLE account_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON account_integrations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for anon" ON account_integrations FOR ALL TO anon USING (true);
```

#### `{provider}_properties` — Cache provider-specific data (optional, for property sync)
```sql
CREATE TABLE IF NOT EXISTS {provider}_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  field_label VARCHAR(500) NOT NULL,
  field_type VARCHAR(100) NOT NULL,
  object_type VARCHAR(50) NOT NULL,
  -- add provider-specific columns as needed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX ON {provider}_properties(account_id, object_type, field_name);
ALTER TABLE {provider}_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON {provider}_properties FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for anon" ON {provider}_properties FOR ALL TO anon USING (true);
```

**Critical rule:** Never drop these tables in "cleanup" migrations. If a migration removes tables, always verify they are truly unused first. Dropping `account_integrations` or `app_settings` will break all integrations immediately.

---

### 2. Supabase Client Configuration

Create two clients in `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side / default client (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key (bypasses RLS)
export const getServerSupabase = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey);
};
```

**Critical rule:** ALL server-side code that reads/writes tokens or credentials MUST use the service-role client (`getServerSupabase()`). The anon client can silently fail due to RLS in serverless environments where there's no authenticated user session. Use a helper pattern:

```typescript
function getDbClient() {
  try {
    return getServerSupabase();
  } catch {
    return supabase; // fallback for edge cases
  }
}
```

---

### 3. Token Management — The Most Critical Part

**The #1 rule:** The database is the sole source of truth for tokens. In-memory caching is optional and ephemeral.

#### Why this matters on serverless:
- Each request may hit a different serverless instance
- In-memory variables (`let storedTokens = null`) reset on cold starts
- Deployments kill ALL instances — every in-memory token is lost
- The OAuth callback and subsequent API calls may run on different instances

#### Token loading pattern:
```typescript
async function loadTokensFromDb(accountId: string): Promise<Tokens | null> {
  const db = getDbClient(); // MUST use service-role client
  const { data, error } = await db
    .from('account_integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('account_id', accountId)
    .eq('provider', 'your_provider')
    .eq('is_active', true)
    .single();

  if (error || !data?.access_token) return null;

  // Handle BIGINT → number conversion (Supabase may return strings)
  let expiresAt = 0;
  if (data.token_expires_at != null) {
    expiresAt = typeof data.token_expires_at === 'string'
      ? parseInt(data.token_expires_at, 10)
      : Number(data.token_expires_at);
    if (isNaN(expiresAt)) expiresAt = 0;
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
  };
}
```

#### Token refresh pattern:
```typescript
async function getValidAccessToken(accountId: string): Promise<string | null> {
  // 1. Always read from DB first — in-memory cache may be stale
  const dbTokens = await loadTokensFromDb(accountId);
  if (!dbTokens) return null;

  // 2. Check expiry with buffer (5 min before actual expiry)
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000;
  const isExpired = dbTokens.expires_at === 0 || now > dbTokens.expires_at - bufferMs;

  if (!isExpired) return dbTokens.access_token;

  // 3. Refresh the token
  try {
    const refreshed = await refreshAccessToken(dbTokens.refresh_token);
    await saveTokensToDb(refreshed, accountId);
    return refreshed.access_token;
  } catch (err) {
    // 4. Re-read DB as last resort (user may have re-authenticated)
    const freshTokens = await loadTokensFromDb(accountId);
    if (freshTokens && freshTokens.access_token !== dbTokens.access_token) {
      const freshExpiry = freshTokens.expires_at || 0;
      if (freshExpiry > 0 && now < freshExpiry - bufferMs) {
        return freshTokens.access_token;
      }
    }
    return null;
  }
}
```

#### Credential loading pattern:
```typescript
// OAuth client ID / secret should check env vars first, then DB
async function getClientCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const envId = process.env.PROVIDER_CLIENT_ID;
  const envSecret = process.env.PROVIDER_CLIENT_SECRET;
  if (envId && envSecret) return { clientId: envId, clientSecret: envSecret };

  // Fall back to app_settings table
  const db = getDbClient(); // service-role client
  const { data } = await db
    .from('app_settings')
    .select('key, value')
    .in('key', ['provider_client_id', 'provider_client_secret']);

  // parse and return...
}
```

---

### 4. OAuth Flow — API Routes

#### `GET /api/{provider}/oauth/callback`
```
1. Exchange code for tokens
2. Fetch provider account/org ID
3. Verify required scopes were granted
4. Save tokens to DB via service-role client
5. Auto-sync any provider data (properties, metadata, etc.)
6. Return success page that posts message to opener window
```

**Important:** Multi-screen consent flows (common with unapproved apps) can grant partial scopes. Always verify scopes after token exchange and reject partial grants with a clear user-facing message.

#### `POST /api/{provider}/properties` (or similar sync endpoint)
```
1. Resolve account ID from header or session
2. Get valid access token (loads from DB, refreshes if needed)
3. Fetch data from provider API
4. Save to cache table (delete + insert, or upsert)
5. Return detailed success/error with counts
```

#### `GET /api/{provider}/properties`
```
1. Return cached data from DB
2. If cache is empty, auto-fetch from provider and cache
3. Return results
```

---

### 5. Error Handling — Always Surface the Real Error

**Never do this:**
```typescript
catch (error) {
  return NextResponse.json({ error: 'Failed to sync' }, { status: 500 });
}
```

**Always do this:**
```typescript
catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Sync failed:', message);
  return NextResponse.json(
    { success: false, error: `Failed to sync properties: ${message}` },
    { status: 500 }
  );
}
```

Generic error messages make debugging in production nearly impossible. The actual error message is the difference between hours of guessing and a 5-minute fix.

---

### 6. UI — Connection Status and Re-Sync

#### Connection status checks should be non-blocking:
- Show cached/synced data even if the connection check temporarily fails
- Don't hide provider-sourced data just because a status API call errors
- Provider data persists in the DB — it should remain visible regardless of connection status

#### Re-Sync button flow:
```
1. POST to sync endpoint with account ID in x-account-id header
2. Show loading state
3. Display actual success message with counts (added/updated/removed)
4. Display actual error message on failure (not generic)
5. Reload data from DB after sync
```

---

### 7. Migration Safety Rules

1. **Never drop tables without verifying they're unused** — search the entire codebase for table references
2. **Always use `CREATE TABLE IF NOT EXISTS`** and `CREATE INDEX IF NOT EXISTS` for idempotent migrations
3. **Always include RLS policies** in the same migration that creates the table
4. **Always include update triggers** for `updated_at` columns
5. **Test migrations with `supabase db push`** — verify "up to date" doesn't mean "silently broken"

---

### 8. Environment Variables Checklist

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key (server-side only, NEVER expose to client)
NEXT_PUBLIC_APP_URL=             # Your app's public URL (for OAuth redirect URI)
{PROVIDER}_CLIENT_ID=            # OAuth client ID (optional if stored in app_settings)
{PROVIDER}_CLIENT_SECRET=        # OAuth client secret (optional if stored in app_settings)
```

---

### 9. Deployment Survival Checklist

Before deploying, verify:
- [ ] Tokens are stored in `account_integrations` (not just in-memory)
- [ ] Token loading uses service-role client (not anon)
- [ ] Token refresh works without in-memory state
- [ ] OAuth credential loading falls back to DB if env vars aren't set
- [ ] Error messages include actual error details
- [ ] Provider data (properties, headings, etc.) persists in DB and displays regardless of connection status
- [ ] No migration drops tables that are still referenced in code
- [ ] RLS policies exist on all tables with both `authenticated` and `anon` access

---

### Summary of Hard-Learned Lessons

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| Integration disconnects on every deploy | Tokens stored only in-memory | Store in `account_integrations` table |
| Re-Sync fails after deploy | Token loading uses anon client, fails with RLS | Use service-role client for all server-side DB ops |
| "Failed to sync" with no useful info | Generic error message swallows real error | Always include `error.message` in response |
| Provider data disappears after deploy | UI hides data when connection check fails | Show cached data regardless of connection status |
| Tables mysteriously vanish | Migration dropped "unused" tables that were actually used | Never drop tables without full codebase search |
| OAuth only grants partial scopes | Multi-screen consent flow, user skips second screen | Verify scopes after token exchange, reject partial grants |
| Token refresh fails | OAuth credentials not available (env vars or DB) | Load credentials from env vars with DB fallback |
| BIGINT columns return strings | Supabase serializes BIGINT as string | Always parse with parseInt/Number before comparing |
