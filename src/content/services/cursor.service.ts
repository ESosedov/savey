import { Injectable, BadRequestException } from '@nestjs/common';

export interface CursorData {
  createdAt: Date;
  id: string;
}

@Injectable()
export class CursorService {
  encode(createdAt: Date, id: string): string {
    const cursorData = {
      createdAt: createdAt.toISOString(),
      id,
    };

    const jsonString = JSON.stringify(cursorData);
    return Buffer.from(jsonString).toString('base64');
  }

  decode(cursor: string): CursorData {
    try {
      const jsonString = Buffer.from(cursor, 'base64').toString('utf-8');
      const data = JSON.parse(jsonString);

      return {
        createdAt: new Date(data.createdAt),
        id: data.id,
      };
    } catch (error) {
      throw new BadRequestException('Invalid cursor format');
    }
  }
}
