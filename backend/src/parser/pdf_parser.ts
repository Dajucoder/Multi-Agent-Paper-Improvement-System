import fs from 'fs';
import pdfParse from 'pdf-parse';

async function parsePdfBuffer(buffer: Buffer): Promise<{ text: string }> {
  const moduleRef = pdfParse as any;

  if (typeof moduleRef === 'function') {
    return moduleRef(buffer);
  }

  if (typeof moduleRef?.default === 'function') {
    return moduleRef.default(buffer);
  }

  if (typeof moduleRef?.PDFParse === 'function') {
    const parser = new moduleRef.PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return { text: result?.text || '' };
    } finally {
      await parser.destroy?.();
    }
  }

  throw new Error('Unsupported pdf-parse module shape.');
}

export class PDFParser {
  /**
   * Parse a local PDF file into plain text.
   */
  static async parseFile(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await parsePdfBuffer(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF document.');
    }
  }

  /**
   * Parse a buffer directly (e.g., from multer memory storage)
   */
  static async parseBuffer(buffer: Buffer): Promise<string> {
    try {
      const data = await parsePdfBuffer(buffer);
      return data.text;
    } catch (error) {
      console.error('Error parsing PDF buffer:', error);
      throw new Error('Failed to parse PDF document.');
    }
  }
}
