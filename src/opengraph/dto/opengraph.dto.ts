export class OpenGraphDto {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: Array<{
    url: string;
    width?: string;
    height?: string;
    type?: string;
  }>;
  ogUrl?: string;
  ogType?: string;
  ogSiteName?: string;
  charset?: string;
  favicon?: string;
  success: boolean;
}

export class GetPreviewDto {
  url: string;
}
