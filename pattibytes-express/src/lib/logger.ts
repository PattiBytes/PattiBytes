/* eslint-disable @typescript-eslint/no-explicit-any */
export const logger = {
  error: (message: string, data?: any, error?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    } else {
      console.error(message);
    }
  },
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    } else {
      console.warn(message);
    }
  },
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  },
};
