import { createElement } from 'react';

export type VideoKind = 'youtube' | 'vimeo' | 'unknown';

export interface VideoEmbed {
  kind: VideoKind;
  src: string | null;
}

const YOUTUBE_PATTERNS: [RegExp, string][] = [
  [/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/, '$1'],
  [/youtu\.be\/([a-zA-Z0-9_-]{11})/, '$1'],
  [/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/, '$1'],
  [/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/, '$1'],
];

const VIMEO_PATTERN = /vimeo\.com\/(\d+)/;

export function getEmbedUrl(url: string): VideoEmbed {
  if (!url) return { kind: 'unknown', src: null };

  const trimmed = url.trim();

  for (const [pattern, idGroup] of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const videoId = match[0].replace(pattern, idGroup);
      return { kind: 'youtube', src: `https://www.youtube.com/embed/${videoId}` };
    }
  }

  const vimeoMatch = trimmed.match(VIMEO_PATTERN);
  if (vimeoMatch) {
    return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  return { kind: 'unknown', src: null };
}

export function VideoEmbedIframe({ url, className }: { url: string; className?: string }) {
  const embed = getEmbedUrl(url);
  if (!embed.src) return null;

  return createElement('iframe', {
    src: embed.src,
    className: className ?? 'w-full aspect-video rounded-[20px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
    allowFullScreen: true,
  });
}
