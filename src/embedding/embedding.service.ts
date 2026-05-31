import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const EMBEDDING_MODEL = 'gemini-embedding-2-preview';
const EMBEDDING_DIMS = 3072;

@Injectable()
export class EmbeddingService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateForContent(
    title: string,
    description?: string | null,
  ): Promise<number[]> {
    const text = description
      ? `task: search result | document: ${title} | text: ${description}`
      : `task: search result | document: ${title}`;

    return this.embed(text);
  }

  async generateFromImage(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

    const result = await model.embedContent({
      content: {
        role: 'user',
        parts: [
          { text: 'task: search result | document:' },
          { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
        ],
      },
      outputDimensionality: EMBEDDING_DIMS,
    } as any);

    return result.embedding.values;
  }

  async generateForQuery(query: string): Promise<number[]> {
    return this.embed(`task: search result | query: ${query}`);
  }

  private async embed(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMS,
    } as any);

    return result.embedding.values;
  }
}
