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
  'acknowledgement',
  'acknowledgements',
  '摘要',
  '引言',
  '相关工作',
  '方法',
  '实验',
  '实验结果',
  '结论',
  '参考文献',
]);

function normalizeLine(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function isLikelyTableOfContentsLine(line: string) {
  const normalized = normalizeLine(line);
  if (!normalized) return false;

  // "1 Introduction ........ 3" style lines from table of contents
  if (/(\.{2,}|…{2,})\s*\d{1,4}$/.test(normalized)) return true;
  if (/\.{2,}\s*$/.test(normalized)) return true;

  // A short heading-like text ending with page number is often TOC noise
  const words = normalized.split(/\s+/);
  if (words.length >= 3 && words.length <= 10 && /^.{3,80}\s+\d{1,4}$/.test(normalized)) return true;

  return false;
}

function isShortTitleLine(line: string) {
  const normalized = normalizeLine(line);
  if (!normalized) return false;
  if (normalized.length > 80) return false;
  if (/[。！？.!?]$/.test(normalized)) return false;
  if (isLikelyTableOfContentsLine(normalized)) return false;
  if (/https?:\/\//i.test(normalized)) return false;
  return true;
}

function isLikelyHeading(line: string) {
  const normalized = normalizeLine(line);
  if (!normalized || normalized.length > 120) return false;
  if (isLikelyTableOfContentsLine(normalized)) return false;
  if (/https?:\/\//i.test(normalized)) return false;
  if (/[@#]\w+/.test(normalized)) return false;
  if (/[;；，,。!?！？]$/.test(normalized) && normalized.length > 30) return false;
  if ((normalized.match(/\d/g) || []).length > Math.max(6, Math.floor(normalized.length / 2))) return false;

  // Chinese chapter patterns: 第1章 / 第一章 / 一、引言 / （一）研究方法
  if (/^第\s*[一二三四五六七八九十百千0-9]+\s*[章节篇部](?:\s+.+)?$/.test(normalized)) return true;
  if (/^[一二三四五六七八九十百千]{1,4}[、.．]\s*\S+/.test(normalized)) return true;
  if (/^[（(][一二三四五六七八九十百千0-9]{1,4}[)）]\s*\S+/.test(normalized)) return true;

  // English chapter/section patterns: Chapter 1, 1 Introduction, 1.2 Method, II. RELATED WORK
  if (/^chapter\s+\d{1,2}(?:\s*[:.-]\s*.*)?$/i.test(normalized)) return true;
  if (/^\d{1,2}(?:\.\d{1,2}){0,2}\s+[A-Za-z\u4e00-\u9fa5][A-Za-z\u4e00-\u9fa5\s/&:()\-]{1,}$/.test(normalized)) return true;
  if (/^[IVX]{1,6}[.)]?\s+[A-Za-z][A-Za-z\s/&:()\-]{1,}$/i.test(normalized)) return true;

  const lowered = normalized.toLowerCase();
  if (COMMON_SECTION_HEADINGS.has(lowered)) return true;

  // ALL CAPS headings are common in academic PDFs
  if (/^[A-Z][A-Z\s/&()\-]{3,}$/.test(normalized) && normalized.split(/\s+/).length <= 10) return true;

  // Title-case compact lines are often major headings: "Related Work", "Methodology"
  if (/^[A-Z][A-Za-z\s/&()\-]{2,}$/.test(normalized) && normalized.split(/\s+/).length <= 8 && normalized.length <= 60) {
    return COMMON_SECTION_HEADINGS.has(lowered) || /work|method|experiment|result|discussion|conclusion|background|introduction|appendix/i.test(normalized);
  }

  return false;
}

function toChapterTitle(line: string) {
  const normalized = normalizeLine(line);
  const lowered = normalized.toLowerCase();
  if (lowered === 'abstract' || lowered === 'preliminaries' || normalized === '摘要') {
    return 'Abstract / Preliminaries';
  }
  return normalized;
}

function shouldStorePreface(prefaceLines: string[]) {
  const prefaceText = prefaceLines.join('\n').trim();
  if (!prefaceText) return false;
  if (/\babstract\b/i.test(prefaceText) || /摘要/.test(prefaceText)) return true;
  return prefaceText.length > 180;
}

function postProcessChapters(chapters: Chapter[], fullText: string): Chapter[] {
  if (!chapters.length) {
    return [{ chapterNo: 1, chapterTitle: 'Full Document (Unstructured)', content: fullText }];
  }

  const filtered = chapters.filter((chapter) => chapter.content.trim().length > 0);
  if (!filtered.length) {
    return [{ chapterNo: 1, chapterTitle: 'Full Document (Unstructured)', content: fullText }];
  }

  const avgLen = filtered.reduce((sum, item) => sum + item.content.trim().length, 0) / filtered.length;
  if (fullText.length > 3000 && filtered.length >= 6 && avgLen < 120) {
    // This pattern usually indicates TOC-like over-segmentation or noisy extraction.
    return [{ chapterNo: 1, chapterTitle: 'Full Document (Unstructured)', content: fullText }];
  }

  let nonAbstractCounter = 1;
  return filtered.map((chapter) => {
    if (chapter.chapterNo === 0) {
      return chapter;
    }

    const next = {
      ...chapter,
      chapterNo: nonAbstractCounter,
    };
    nonAbstractCounter += 1;
    return next;
  });
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

    for (let i = 0; i < lines.length; i += 1) {
      const rawLine = lines[i];
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
        let headingLine = normalizedLine;
        const nextLine = normalizeLine(lines[i + 1] || '');

        // Merge two-line heading patterns such as:
        // Chapter 2
        // Methodology
        if ((/^chapter\s+\d{1,2}$/i.test(headingLine) || /^第\s*[一二三四五六七八九十百千0-9]+\s*[章节篇部]$/.test(headingLine)) && isShortTitleLine(nextLine)) {
          headingLine = `${headingLine} ${nextLine}`;
          i += 1;
        }

        if (!currentTitle && shouldStorePreface(preface)) {
          chapters.push({
            chapterNo: 0,
            chapterTitle: 'Abstract / Preliminaries',
            content: preface.join('\n').trim(),
          });
        }

        flushCurrentChapter();
        currentTitle = toChapterTitle(headingLine);
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
    } else if (shouldStorePreface(preface)) {
      chapters.push({
        chapterNo: 0,
        chapterTitle: 'Abstract / Preliminaries',
        content: preface.join('\n').trim(),
      });
    }

    // Fallback: If no chapters found, return the whole document as one chapter
    return postProcessChapters(chapters, normalizedText);
  }
}
