import Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: 'https://2ba4ede5ebe347f7abb5f2f02a6f8e90@error.ruangobat.id/4',
  integrations: [nodeProfilingIntegration()],

  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});
