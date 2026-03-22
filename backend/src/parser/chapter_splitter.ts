export interface Chapter {
  chapterNo: number;
  chapterTitle: string;
  content: string;
}

export class ChapterSplitter {
  /**
   * Split the raw document text into chapters using common structural heuristics (e.g., "第X章", "Chapter X", "1. ", etc.)
   * For the MVP, we use regex to detect heading patterns.
   */
  static splitRawText(rawText: string): Chapter[] {
    const chapters: Chapter[] = [];
    
    // Very basic regex to find typical chapter headings
    // e.g. "第一章 绪论", "Chapter 1 Introduction", "1 Introduction"
    const regex = /(?:^|\n)\s*(第[一二三四五六七八九十百]+章|Chapter\s*\d+|\d+\.)\s*([^\n]+)/g;
    
    let match;
    let lastIndex = 0;
    let currentChapterInfo: { title: string, no: number } | null = null;
    let chapterCounter = 1;

    while ((match = regex.exec(rawText)) !== null) {
      // If we have a previous chapter, finalize its content
      if (currentChapterInfo) {
        const content = rawText.substring(lastIndex, match.index).trim();
        chapters.push({
          chapterNo: currentChapterInfo.no,
          chapterTitle: currentChapterInfo.title,
          content
        });
      } else {
        // Text before the first chapter (e.g., Abstract, Title page)
        const content = rawText.substring(0, match.index).trim();
        if (content.length > 50) {
          chapters.push({
            chapterNo: 0,
            chapterTitle: 'Abstract / Preliminaries',
            content
          });
        }
      }

      currentChapterInfo = {
        title: `${match[1]} ${match[2]}`,
        no: chapterCounter++
      };
      
      // Update lastIndex to point right after the current heading
      lastIndex = match.index + match[0].length;
    }

    // Add the final chapter
    if (currentChapterInfo) {
      const content = rawText.substring(lastIndex).trim();
      chapters.push({
        chapterNo: currentChapterInfo.no,
        chapterTitle: currentChapterInfo.title,
        content
      });
    }

    // Fallback: If no chapters found, return the whole document as one chapter
    if (chapters.length === 0) {
      chapters.push({
        chapterNo: 1,
        chapterTitle: 'Full Document (Unstructured)',
        content: rawText.trim()
      });
    }

    return chapters;
  }
}
