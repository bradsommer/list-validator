import type { LogEntry } from '@/types';

type LogLevel = 'info' | 'warning' | 'error' | 'success';
type LogStep = 'upload' | 'parse' | 'validate' | 'enrich' | 'hubspot' | 'audit' | 'export';

// Generate a unique session ID
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// In-memory log storage - no external persistence for security
let inMemoryLogs: LogEntry[] = [];
const MAX_LOGS = 1000;

// Log function - fully client-side, no data persistence
export function log(
  level: LogLevel,
  step: LogStep,
  message: string,
  sessionId: string,
  details?: Record<string, unknown>,
  userId?: string
): LogEntry {
  const logEntry: LogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    level,
    step,
    message,
    details,
    userId,
    sessionId,
  };

  // Add to in-memory logs
  inMemoryLogs.push(logEntry);

  // Keep only last MAX_LOGS logs in memory
  if (inMemoryLogs.length > MAX_LOGS) {
    inMemoryLogs = inMemoryLogs.slice(-MAX_LOGS);
  }

  // Console output for development
  const logColor = {
    info: '\x1b[36m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    success: '\x1b[32m',
  };
  const reset = '\x1b[0m';
  console.log(
    `${logColor[level]}[${level.toUpperCase()}]${reset} [${step}] ${message}`,
    details ? JSON.stringify(details, null, 2) : ''
  );

  return logEntry;
}

// Convenience functions
export const logInfo = (step: LogStep, message: string, sessionId: string, details?: Record<string, unknown>) =>
  log('info', step, message, sessionId, details);

export const logWarning = (step: LogStep, message: string, sessionId: string, details?: Record<string, unknown>) =>
  log('warning', step, message, sessionId, details);

export const logError = (step: LogStep, message: string, sessionId: string, details?: Record<string, unknown>) =>
  log('error', step, message, sessionId, details);

export const logSuccess = (step: LogStep, message: string, sessionId: string, details?: Record<string, unknown>) =>
  log('success', step, message, sessionId, details);

// Get logs for a session - in-memory only
export function getSessionLogs(sessionId: string): LogEntry[] {
  return inMemoryLogs.filter((log) => log.sessionId === sessionId);
}

// Get all logs - in-memory only
export function getAllLogs(limit = 100): LogEntry[] {
  return inMemoryLogs.slice(-limit);
}

// Clear session logs - for security, clear when session ends
export function clearSessionLogs(sessionId: string): number {
  const before = inMemoryLogs.length;
  inMemoryLogs = inMemoryLogs.filter((log) => log.sessionId !== sessionId);
  return before - inMemoryLogs.length;
}

// Clear all logs - call when user closes tab
export function clearAllLogs(): void {
  inMemoryLogs = [];
}

// Export logs as JSON (for download before clearing)
export function exportLogsAsJson(logs: LogEntry[]): string {
  return JSON.stringify(logs, null, 2);
}

// Export logs as CSV
export function exportLogsAsCsv(logs: LogEntry[]): string {
  const headers = ['Timestamp', 'Level', 'Step', 'Message', 'Session ID'];
  const rows = logs.map((log) => [
    log.timestamp,
    log.level,
    log.step,
    log.message,
    log.sessionId,
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}
