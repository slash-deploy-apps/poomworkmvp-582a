/** Open CORS for preview / cross-origin hosts (any origin, common methods & headers). */
export const OPEN_CORS_HEADER_ENTRIES: [string, string][] = [
  ['Access-Control-Allow-Origin', '*'],
  [
    'Access-Control-Allow-Methods',
    'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
  ],
  [
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Cookie, X-Requested-With, Accept',
  ],
];

export function applyOpenCorsToHeaders(headers: Headers): void {
  for (const [key, value] of OPEN_CORS_HEADER_ENTRIES) {
    headers.set(key, value);
  }
}
