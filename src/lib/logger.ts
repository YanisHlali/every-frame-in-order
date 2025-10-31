type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.isDevelopment && level === 'debug') {
      return;    }

    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...context
    };

    switch (level) {
      case 'error':
        console.error(`[${timestamp}] ERROR:`, message, context || '');
        break;
      case 'warn':
        console.warn(`[${timestamp}] WARN:`, message, context || '');
        break;
      case 'info':
        if (this.isDevelopment) {
          console.info(`[${timestamp}] INFO:`, message, context || '');
        }
        break;
      case 'debug':
        if (this.isDevelopment) {
          console.debug(`[${timestamp}] DEBUG:`, message, context || '');
        }
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
