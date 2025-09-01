export interface OpenGraphOptions {
  timeout?: number;
  userAgent?: string;
  onlyGetOpenGraphInfo?: boolean;
  customMetaTags?: Array<{
    multiple: boolean;
    property: string;
    fieldName: string;
  }>;
  blacklist?: string[];
}
