import { createClient } from '@supabase/supabase-js';

// Disable Next.js 14 fetch caching for all Supabase requests.
// Without this, Next.js caches PostgREST GET responses (e.g. token lookups)
// so writes are invisible to subsequent reads — the root cause of the
// "HubSpot shows not-connected after navigating away" bug.
const fetchOptions = {
  global: {
    fetch: (...args: Parameters<typeof fetch>) => {
      // Inject cache: 'no-store' into every request made by the Supabase client
      const [input, init] = args;
      return fetch(input, { ...init, cache: 'no-store' as RequestCache });
    },
  },
};

// Lazy-initialised clients so module import during `next build` doesn't
// crash when env vars aren't available (static page collection phase).
let _supabase: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
  if (_supabase) return _supabase;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  _supabase = createClient(supabaseUrl, supabaseAnonKey, fetchOptions);
  return _supabase;
};

/** @deprecated Use getSupabase() instead — kept for backwards-compat */
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabase(), prop, receiver);
  },
});

// Server-side client with service role key for admin operations (singleton)
let _serverSupabase: ReturnType<typeof createClient> | null = null;

export const getServerSupabase = () => {
  if (_serverSupabase) return _serverSupabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Server-side Supabase operations require this env var.'
    );
  }

  _serverSupabase = createClient(supabaseUrl, serviceRoleKey, fetchOptions);
  return _serverSupabase;
};
