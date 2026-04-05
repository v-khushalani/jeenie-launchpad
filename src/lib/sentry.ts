// Only initialize in production or when DSN is set
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
let sentryModule: typeof import('@sentry/react') | null = null;

const getSentry = async () => {
  if (!sentryModule) {
    sentryModule = await import('@sentry/react');
  }
  return sentryModule;
};

export const initSentry = () => {
  if (!SENTRY_DSN || import.meta.env.DEV) {
    return;
  }

  void (async () => {
    const Sentry = await getSentry();

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE,
      
      // Performance monitoring
      tracesSampleRate: 0.1, // 10% of transactions
      
      // Session replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // Integration options
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],

      // Filter sensitive data
      beforeSend(event) {
        // Remove sensitive data from error reports
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }
        return event;
      },

      // Ignore common non-actionable errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error exception captured',
        'Network Error',
        'AbortError',
      ],
    });
  })();
};

// Helper to set user context
export const setSentryUser = (user: { id: string; email?: string; username?: string } | null) => {
  if (!sentryModule) return;

  const Sentry = sentryModule;
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
};

// Helper to capture custom messages
export const captureMessage = (message: string, level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info') => {
  if (!sentryModule) return;
  sentryModule.captureMessage(message, level);
};

// Helper to capture errors with additional context
export const captureError = (error: Error, context?: Record<string, any>) => {
  if (!sentryModule) return;

  const Sentry = sentryModule;
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach((key) => {
        scope.setExtra(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
};

// Helper to add breadcrumb
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, any>
) => {
  if (!sentryModule) return;

  sentryModule.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now() / 1000,
  });
};
