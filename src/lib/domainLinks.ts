/**
 * Client-safe domain link helpers.
 * Uses NEXT_PUBLIC_ env vars which are inlined at build time.
 */

const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || '';
const marketingDomain = process.env.NEXT_PUBLIC_MARKETING_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || '';

function getHostname(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

const splitEnabled = !!(appDomain && marketingDomain && getHostname(appDomain) !== getHostname(marketingDomain));

/** Full URL on the app domain (app.freshsegments.com). Returns relative path if split is disabled. */
export function appLink(path: string): string {
  if (!splitEnabled) return path;
  return `${appDomain}${path}`;
}

/** Full URL on the marketing domain (freshsegments.com). Returns relative path if split is disabled. */
export function marketingLink(path: string): string {
  if (!splitEnabled) return path;
  return `${marketingDomain}${path}`;
}

/** Whether domain splitting is active (different hostnames configured) */
export const isDomainSplitActive = splitEnabled;
