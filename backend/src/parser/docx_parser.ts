import mammoth from 'mammoth';

export class DOCXParser {
  /**
   * Parse a local DOCX file into plain text.
   */
  static async parseFile(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error('Error parsing DOCX:', error);
      throw new Error('Failed to parse DOCX document.');
    }
  }

  /**
   * Parse a buffer directly
   */
  static async parseBuffer(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('Error parsing DOCX buffer:', error);
      throw new Error('Failed to parse DOCX document.');
    }
  }
}
