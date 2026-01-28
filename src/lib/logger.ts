import { supabase } from './supabase';
import type { LogEntry } from '@/types';

type LogLevel = 'info' | 'warning' | 'error' | 'success';
type LogStep = 'upload' | 'parse' | 'validate' | 'enrich' | 'hubspot' | 'audit' | 'export';

// Generate a unique session ID
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// In-memory log storage for client-side
let inMemoryLogs: LogEntry[] = [];

// Log function that works both client and server side
export async function log(
  level: LogLevel,
  step: LogStep,
  message: string,
  sessionId: string,
  details?: Record<string, unknown>,
  userId?: string
): Promise<LogEntry> {
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

  // Keep only last 1000 logs in memory
  if (inMemoryLogs.length > 1000) {
    inMemoryLogs = inMemoryLogs.slice(-1000);
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

  // Try to save to Supabase (will fail silently if not configured)
  try {
    await supabase.from('logs').insert({
      id: logEntry.id,
      timestamp: logEntry.timestamp,
      level: logEntry.level,
      step: logEntry.step,
      message: logEntry.message,
      details: logEntry.details,
      user_id: logEntry.userId,
      session_id: logEntry.sessionId,
    });
  } catch (error) {
    // Silently fail - in-memory logs will still work
  }

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

// Get logs for a session
export async function getSessionLogs(sessionId: string): Promise<LogEntry[]> {
  // First, check in-memory logs
  const memoryLogs = inMemoryLogs.filter((log) => log.sessionId === sessionId);

  // Try to get from Supabase
  try {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (!error && data) {
      return data.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level,
        step: log.step,
        message: log.message,
        details: log.details,
        userId: log.user_id,
        sessionId: log.session_id,
      }));
    }
  } catch {
    // Fall back to memory logs
  }

  return memoryLogs;
}

// Get all logs (for admin view)
export async function getAllLogs(limit = 100): Promise<LogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (!error && data) {
      return data.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level,
        step: log.step,
        message: log.message,
        details: log.details,
        userId: log.user_id,
        sessionId: log.session_id,
      }));
    }
  } catch {
    // Return in-memory logs
  }

  return inMemoryLogs.slice(-limit);
}

// Clear old logs (for maintenance)
export async function clearOldLogs(daysOld = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  try {
    const { count, error } = await supabase
      .from('logs')
      .delete()
      .lt('timestamp', cutoffDate.toISOString())
      .select('*', { count: 'exact', head: true });

    if (!error) {
      return count || 0;
    }
  } catch {
    // Silently fail
  }

  return 0;
}

// Export logs as JSON
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
