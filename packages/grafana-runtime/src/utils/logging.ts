import { faro, type LogContext, LogLevel } from '@grafana/faro-web-sdk';

import { config } from '../config';

import { TracedError } from './TracedError';

export type StructuredLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log a message at INFO level
 * @public
 */
export function logInfo(message: string, contexts?: LogContext) {
  if (config.grafanaJavascriptAgent.enabled) {
    faro.api.pushLog([message], {
      level: LogLevel.INFO,
      context: contexts,
    });
  }
}

/**
 * Log a message at WARNING level
 *
 * @public
 */
export function logWarning(message: string, contexts?: LogContext) {
  if (config.grafanaJavascriptAgent.enabled) {
    faro.api.pushLog([message], {
      level: LogLevel.WARN,
      context: contexts,
    });
  }
}

/**
 * Log a message at DEBUG level
 *
 * @public
 */
export function logDebug(message: string, contexts?: LogContext) {
  if (config.grafanaJavascriptAgent.enabled) {
    faro.api.pushLog([message], {
      level: LogLevel.DEBUG,
      context: contexts,
    });
  }
}

/**
 * Log an error
 *
 * @public
 */
export function logError(err: Error, contexts?: LogContext) {
  if (config.grafanaJavascriptAgent.enabled) {
    faro.api.pushError(err, {
      context: contexts,
    });
  }
}

function formatLogValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  try {
    return (
      JSON.stringify(value, (_key, nestedValue) =>
        typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue
      ) ?? String(value)
    );
  } catch {
    return String(value);
  }
}

/**
 * Sends console-style values to the monitoring backend as a structured log.
 *
 * @public
 */
export function logStructured(source: string, level: StructuredLogLevel, ...values: unknown[]): void {
  const errorIndex = values.findIndex((value) => value instanceof Error);
  const error = errorIndex >= 0 ? (values[errorIndex] as Error) : undefined;
  const messageIndex = values.findIndex((_value, index) => index !== errorIndex);
  const messageValue = messageIndex >= 0 ? values[messageIndex] : undefined;
  const message = formatLogValue(messageValue ?? error ?? 'No log message provided');
  const context = values.reduce<LogContext>(
    (result, value, index) => {
      if (index !== messageIndex && index !== errorIndex) {
        result[`argument${index}`] = formatLogValue(value);
      }
      return result;
    },
    { source }
  );

  switch (level) {
    case 'debug':
      logDebug(message, context);
      break;
    case 'info':
      logInfo(message, context);
      break;
    case 'warn':
      logWarning(message, context);
      break;
    case 'error':
      logError(error ? new TracedError(message, error) : new Error(message), context);
      break;
  }
}

/**
 * Log a measurement
 *
 * @public
 */
export type MeasurementValues = Record<string, number>;
export function logMeasurement(type: string, values: MeasurementValues, context?: LogContext) {
  if (config.grafanaJavascriptAgent.enabled) {
    faro.api.pushMeasurement(
      {
        type,
        values,
      },
      { context: context }
    );
  }
}

export interface MonitoringLogger {
  logDebug: (message: string, contexts?: LogContext) => void;
  logInfo: (message: string, contexts?: LogContext) => void;
  logWarning: (message: string, contexts?: LogContext) => void;
  logError: (error: Error, contexts?: LogContext) => void;
  logMeasurement: (type: string, measurement: MeasurementValues, contexts?: LogContext) => void;
}

/**
 * Creates a monitoring logger with five levels of logging methods: `logDebug`, `logInfo`, `logWarning`, `logError`, and `logMeasurement`.
 * These methods use `faro.api.pushX` web SDK methods to report these logs or errors to the Faro collector.
 *
 * @param {string} source - Identifier for the source of the log messages.
 * @param {LogContext} [defaultContext] - Context to be included in every log message.
 * @param {boolean} [logToConsole] - Message and context to be output to console too.
 *
 * @returns {MonitoringLogger} Logger object with five methods:
 * - `logDebug(message: string, contexts?: LogContext)`: Logs a debug message.
 * - `logInfo(message: string, contexts?: LogContext)`: Logs an informational message.
 * - `logWarning(message: string, contexts?: LogContext)`: Logs a warning message.
 * - `logError(error: Error, contexts?: LogContext)`: Logs an error message.
 * - `logMeasurement(type: string, measurement: MeasurementValues, contexts?: LogContext)`: Logs a measurement.
 * Each method combines the `defaultContext` (if provided), the `source`, and an optional `LogContext` parameter into a full context that is included with the log message.
 */
export function createMonitoringLogger(
  source: string,
  defaultContext?: LogContext,
  logToConsole = false
): MonitoringLogger {
  const createFullContext = (contexts?: LogContext) => ({
    source: source,
    ...defaultContext,
    ...contexts,
  });

  return {
    /**
     * Logs a debug message with optional additional context.
     * @param {string} message - The debug message to be logged.
     * @param {LogContext} [contexts] - Optional additional context to be included.
     */
    logDebug: (message: string, contexts?: LogContext) => {
      logDebug(message, createFullContext(contexts));
      if (logToConsole) {
        // eslint-disable-next-line no-console
        console.debug(message, createFullContext(contexts));
      }
    },

    /**
     * Logs an informational message with optional additional context.
     * @param {string} message - The informational message to be logged.
     * @param {LogContext} [contexts] - Optional additional context to be included.
     */
    logInfo: (message: string, contexts?: LogContext) => {
      logInfo(message, createFullContext(contexts));
      if (logToConsole) {
        console.log(message, createFullContext(contexts));
      }
    },

    /**
     * Logs a warning message with optional additional context.
     * @param {string} message - The warning message to be logged.
     * @param {LogContext} [contexts] - Optional additional context to be included.
     */
    logWarning: (message: string, contexts?: LogContext) => {
      logWarning(message, createFullContext(contexts));
      if (logToConsole) {
        console.warn(message, createFullContext(contexts));
      }
    },

    /**
     * Logs an error with optional additional context.
     * @param {Error} error - The error object to be logged.
     * @param {LogContext} [contexts] - Optional additional context to be included.
     */
    logError: (error: Error, contexts?: LogContext) => {
      logError(error, createFullContext(contexts));
      if (logToConsole) {
        console.error(error.message, createFullContext(contexts), error);
      }
    },

    /**
     * Logs a measurement with optional additional context.
     * @param {string} type - The type to be recorded.
     * @param {MeasurementValues} measurement - The measurement object to be recorded.
     * @param {LogContext} [contexts] - Optional additional context to be included.
     */
    logMeasurement: (type: string, measurement: MeasurementValues, contexts?: LogContext) => {
      logMeasurement(type, measurement, createFullContext(contexts));
      if (logToConsole) {
        console.log(type, measurement, createFullContext(contexts));
      }
    },
  };
}
