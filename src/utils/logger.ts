type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private log(level: LogLevel, message: string, meta?: unknown) {
    const timestamp = new Date().toISOString();
    const logEntry: {
      timestamp: string;
      level: LogLevel;
      message: string;
      meta?: unknown;
    } = {
      timestamp,
      level,
      message,
    };

    if (meta !== undefined) {
      logEntry.meta = meta;
    }

    const output = JSON.stringify(logEntry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(output);
        }
        break;
      default:
        console.log(output);
    }
  }

  info(message: string, meta?: unknown) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: unknown) {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | unknown) {
    const meta = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    this.log('error', message, meta);
  }

  debug(message: string, meta?: unknown) {
    this.log('debug', message, meta);
  }
}

export const logger = new Logger();
