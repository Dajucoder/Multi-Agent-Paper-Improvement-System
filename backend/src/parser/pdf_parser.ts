import fs from 'fs';
import pdfParse from 'pdf-parse';

export class PDFParser {
  /**
   * Parse a local PDF file into plain text.
   */
  static async parseFile(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
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
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error('Error parsing PDF buffer:', error);
      throw new Error('Failed to parse PDF document.');
    }
  }
}
