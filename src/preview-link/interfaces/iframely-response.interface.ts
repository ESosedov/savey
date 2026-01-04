// oEmbed format (endpoint: /oembed)
export interface IframelyOembedResponse {
  type?: string;
  version?: string;
  title?: string;
  url?: string;
  author?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  description?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
}

// Full format (endpoint: /iframely)
export interface IframelyFullResponse {
  meta?: {
    title?: string;
    medium?: string;
    site?: string;
    author?: string;
    author_url?: string;
    description?: string;
    keywords?: string;
    canonical?: string;
    date?: string;
  };
  links?: Array<{
    rel?: string[];
    href?: string;
    type?: string;
    media?: Record<string, any>;
    html?: string;
    content_length?: number;
  }>;
  rel?: string[];
  html?: string;
}
