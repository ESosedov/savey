export interface LinkPreviewOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

export interface LinkPreviewResult {
  url: string;
  title?: string;
  description?: string;
  images?: string[];
  siteName?: string;
}

export interface ILinkPreviewResponse {
  url: string;
  title?: string;
  siteName?: string;
  description?: string;
  images?: string[];
  videos?: string[];
  mediaType?: string;
  contentType?: string;
  charset?: string;
  favicons?: string[];
}
