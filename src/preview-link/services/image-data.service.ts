import probe from 'probe-image-size';

export class ImageDataService {
  async getImageData(images: any): Promise<any> {
    if (!images || images.length === 0) {
      return null;
    }

    for (const image of images) {
      if (!image.url.startsWith('https://')) {
        continue;
      }

      try {
        const result = await probe(image.url);

        return {
          width: Number(result.width),
          height: Number(result.height),
          url: result.url,
          type: result.type,
        };
      } catch (error) {
        console.error('Error get image:', error.message);

        continue;
      }
    }

    return null;
  }
}
