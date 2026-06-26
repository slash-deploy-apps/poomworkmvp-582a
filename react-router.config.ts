import type { Config } from '@react-router/dev/config';

// Vercel 환경에서만 vercelPreset 로드
// @vercel/react-router가 없는 로컬 환경에서는 gracefully skip
function getPresets(): Config['presets'] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { vercelPreset } = require('@vercel/react-router/vite');
    return [vercelPreset()];
  } catch {
    return [];
  }
}

export default {
  ssr: true,
  presets: getPresets(),
  /** Allow UI-route actions / fetchers from any host (preview URLs, e2b, etc.). */
  allowedActionOrigins: ['**'],
  future: {
    v8_middleware: true,
  },
} satisfies Config;
