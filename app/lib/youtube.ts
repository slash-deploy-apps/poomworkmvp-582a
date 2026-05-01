export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^&\s]+))/,
    /(?:https?:\/\/youtu\.be\/([^?\s]+))/,
    /(?:https?:\/\/(?:www\.)?youtube\.com\/embed\/([^?\s]+))/,
    /(?:https?:\/\/(?:www\.)?youtube\.com\/shorts\/([^?\s]+))/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  return null;
}