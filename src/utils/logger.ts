/**
 * Simple structured logger for API operations
 * Outputs JSON-formatted logs for easy parsing and monitoring
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Create structured log entry
 */
function createLogEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

/**
 * Simple logger for MVP
 * In production, consider using a dedicated logging service
 */
export const logger = {
  /**
   * Log informational messages
   */
  info: (message: string, meta?: Record<string, unknown>): void => {
    const entry = createLogEntry('info', message, meta);
    console.log(JSON.stringify(entry));
  },

  /**
   * Log warning messages
   */
  warn: (message: string, meta?: Record<string, unknown>): void => {
    const entry = createLogEntry('warn', message, meta);
    console.warn(JSON.stringify(entry));
  },

  /**
   * Log error messages with stack traces
   */
  error: (message: string, meta?: Record<string, unknown>): void => {
    const entry = createLogEntry('error', message, meta);
    console.error(JSON.stringify(entry));
  },
};
