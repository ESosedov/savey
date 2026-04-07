import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const EMBEDDING_MODEL = 'gemini-embedding-2-preview';
const EMBEDDING_DIMS = 3072;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateForContent(
    title: string,
    description?: string | null,
    siteName?: string | null,
  ): Promise<number[]> {
    const parts = [title];
    if (description) parts.push(description);
    if (siteName) parts.push(siteName);
    const text = parts.join('\n');

    return this.generateFromText(text);
  }

  async generateFromText(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({
      model: EMBEDDING_MODEL,
    });

    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT' as any,
      outputDimensionality: EMBEDDING_DIMS,
    } as any);

    return result.embedding.values;
  }

  async generateForQuery(query: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({
      model: EMBEDDING_MODEL,
    });

    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text: query }] },
      taskType: 'RETRIEVAL_QUERY' as any,
      outputDimensionality: EMBEDDING_DIMS,
    } as any);

    return result.embedding.values;
  }
}