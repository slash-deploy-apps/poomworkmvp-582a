import { describe, expect, it } from 'vitest';
import config from '../vite.config';

describe('vite HMR config for sandbox preview', () => {
  it('uses E2B-compatible dev server settings', () => {
    expect(config.server?.port).toBe(5173);
    expect(config.server?.host).toBe('0.0.0.0');
    expect(config.server?.hmr).toMatchObject({ protocol: 'wss', clientPort: 443 });
    expect(config.server?.allowedHosts).toEqual(
      expect.arrayContaining(['.e2b.app', '.slash.ai.kr', 'localhost']),
    );
    expect(config.server?.watch).toMatchObject({
      ignored: expect.arrayContaining(['**/node_modules/**', '**/.git/**']),
    });
  });
});
