import type { Config } from '@react-router/dev/config';

export default {
  ssr: true,
  /** Allow UI-route actions / fetchers from any host (preview URLs, e2b, etc.). */
  allowedActionOrigins: ['**'],
  future: {
    v8_middleware: true,
  },
} satisfies Config;
