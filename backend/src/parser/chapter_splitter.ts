export interface Chapter {
  chapterNo: number;
  chapterTitle: string;
  content: string;
}

const COMMON_SECTION_HEADINGS = new Set([
  'abstract',
  'introduction',
  'related work',
  'background',
  'preliminaries',
  'method',
  'methods',
  'methodology',
  'approach',
  'approaches',
  'experiment',
  'experiments',
  'evaluation',
  'results',
  'discussion',
  'limitations',
  'conclusion',
  'conclusions',
  'references',
  'appendix',
]);

function normalizeLine(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function isLikelyHeading(line: string) {
  const normalized = normalizeLine(line);
  if (!normalized || normalized.length > 120) return false;
  if (/https?:\/\//i.test(normalized)) return false;
  if (/\d+\.\d+/.test(normalized)) return false;
  if ((normalized.match(/\d/g) || []).length > Math.max(4, Math.floor(normalized.length / 3))) return false;

  if (/^第[一二三四五六七八九十百]+章(?:\s+.+)?$/.test(normalized)) return true;
  if (/^chapter\s+\d{1,2}(?:\s*[:.-]\s*|\s+).+/i.test(normalized)) return true;
  if (/^\d{1,2}[.)]\s+[A-Za-z][A-Za-z\s/&:-]{2,}$/.test(normalized)) return true;
  if (/^\d{1,2}\s+[A-Z][A-Z\s/&-]{2,}$/.test(normalized)) return true;

  const lowered = normalized.toLowerCase();
  if (COMMON_SECTION_HEADINGS.has(lowered)) return true;

  if (/^[A-Z][A-Z\s/&-]{3,}$/.test(normalized) && COMMON_SECTION_HEADINGS.has(lowered)) return true;

  return false;
}

function toChapterTitle(line: string) {
  const normalized = normalizeLine(line);
  const lowered = normalized.toLowerCase();
  if (lowered === 'abstract' || lowered === 'preliminaries') {
    return 'Abstract / Preliminaries';
  }
  return normalized;
}

export class ChapterSplitter {
  /**
   * Split the raw document text into chapters using common structural heuristics (e.g., "第X章", "Chapter X", "1. ", etc.)
   * For the MVP, we use regex to detect heading patterns.
   */
  static splitRawText(rawText: string): Chapter[] {
    const normalizedText = String(rawText || '').replace(/\r\n?/g, '\n').trim();
    const chapters: Chapter[] = [];

    if (!normalizedText) {
      return [{ chapterNo: 1, chapterTitle: 'Full Document (Unstructured)', content: '' }];
    }

    const lines = normalizedText.split('\n');
    let currentTitle: string | null = null;
    let currentContent: string[] = [];
    let preface: string[] = [];
    let chapterCounter = 1;

    const flushCurrentChapter = () => {
      if (!currentTitle) return;
      const content = currentContent.join('\n').trim();
      chapters.push({
        chapterNo: currentTitle === 'Abstract / Preliminaries' ? 0 : chapterCounter++,
        chapterTitle: currentTitle,
        content,
      });
      currentTitle = null;
      currentContent = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const normalizedLine = normalizeLine(line);

      if (!normalizedLine) {
        if (currentTitle && currentContent[currentContent.length - 1] !== '') {
          currentContent.push('');
        } else if (!currentTitle && preface[preface.length - 1] !== '') {
          preface.push('');
        }
        continue;
      }

      if (isLikelyHeading(normalizedLine)) {
        if (!currentTitle && preface.join(' ').trim().length > 50) {
          chapters.push({
            chapterNo: 0,
            chapterTitle: 'Abstract / Preliminaries',
            content: preface.join('\n').trim(),
          });
        }

        flushCurrentChapter();
        currentTitle = toChapterTitle(normalizedLine);
        currentContent = [];
        preface = [];
        continue;
      }

      if (currentTitle) {
        currentContent.push(line);
      } else {
        preface.push(line);
      }
    }

    if (currentTitle) {
      flushCurrentChapter();
    } else if (preface.join(' ').trim().length > 50) {
      chapters.push({
        chapterNo: 0,
        chapterTitle: 'Abstract / Preliminaries',
        content: preface.join('\n').trim(),
      });
    }

    // Fallback: If no chapters found, return the whole document as one chapter
    if (chapters.length === 0) {
      chapters.push({
        chapterNo: 1,
        chapterTitle: 'Full Document (Unstructured)',
        content: normalizedText,
      });
    }

    return chapters;
  }
}
