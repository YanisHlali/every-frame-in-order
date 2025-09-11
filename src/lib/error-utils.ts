export interface SafeErrorResponse {
  message: string;
  error?: string;
  stack?: string;
  code?: number;
}

export function createSafeErrorResponse(
  error: unknown,
  defaultMessage: string = 'Internal server error'
): SafeErrorResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (error instanceof Error) {
    return {
      message: error.message || defaultMessage,
      error: isDevelopment ? error.message : undefined,
      stack: isDevelopment ? error.stack : undefined,
      code: 'code' in error ? (error as any).code : undefined
    };
  }
  
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    return {
      message: errorObj.message || defaultMessage,
      error: isDevelopment ? String(error) : undefined,
      code: errorObj.code
    };
  }
  
  return {
    message: defaultMessage,
    error: isDevelopment ? String(error) : undefined
  };
}

export function logError(context: string, error: unknown, details?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const errorInfo = createSafeErrorResponse(error);
  
  console.error(`[${timestamp}] ${context}:`, {
    error: errorInfo,
    details
  });
}

export function handleApiError(error: unknown, defaultMessage?: string): SafeErrorResponse {
  logError('API Error', error);
  return createSafeErrorResponse(error, defaultMessage);
}