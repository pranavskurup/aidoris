import winston from "winston";

export type LogLevel = "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

export type LoggerMetadata = Record<string, unknown>;

export type CreateLoggerOptions = {
  level?: LogLevel;
  defaultMeta?: LoggerMetadata;
  service?: string;
};

export type Logger = winston.Logger;

const validLogLevels: LogLevel[] = ["error", "warn", "info", "http", "verbose", "debug", "silly"];

const getDefaultLogLevel = (): LogLevel => {
  const envLevel = (process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"))?.toLowerCase();

  if (validLogLevels.includes(envLevel as LogLevel)) {
    return envLevel as LogLevel;
  }

  return "info";
};

export const createLogger = (options: CreateLoggerOptions = {}): Logger => {
  const level = options.level ?? getDefaultLogLevel();

  const baseMeta: LoggerMetadata = {};

  if (options.service) {
    baseMeta.service = options.service;
  }

  if (options.defaultMeta) {
    Object.assign(baseMeta, options.defaultMeta);
  }

  const hasMeta = Object.keys(baseMeta).length > 0;

  const logger = winston.createLogger({
    level,
    levels: winston.config.npm.levels,
    defaultMeta: hasMeta ? baseMeta : undefined,
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ level: logLevel, message, timestamp, ...meta }) =>
            JSON.stringify({
              timestamp,
              level: logLevel,
              message,
              ...meta,
            }),
          ),
        ),
      }),
    ],
  });

  return logger;
};

const defaultLogger = createLogger();

export const getLogger = (defaultMeta?: LoggerMetadata): Logger => {
  if (!defaultMeta || Object.keys(defaultMeta).length === 0) {
    return defaultLogger;
  }

  return defaultLogger.child(defaultMeta);
};

export const logger = defaultLogger;

