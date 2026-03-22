import { PrismaClient } from '@prisma/client';
import { fullPaperReviewWorkflow } from '../../engine/workflows/full_paper_review.workflow';
import { activityService } from '../../engine/activity/activity.service';

type ProjectChapterLike = { chapterNo: number; chapterTitle: string; content: string };

function rebuildSourceTextFromChapters(chapters: Array<{ chapterNo: number; chapterTitle: string; content: string }>) {
  return chapters
    .sort((left, right) => left.chapterNo - right.chapterNo)
    .map((chapter) => {
      const title = chapter.chapterTitle?.trim() || `Chapter ${chapter.chapterNo}`;
      const content = chapter.content?.trim() || '';
      return [title, content].filter(Boolean).join('\n\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

function isStructuredChapterSet(chapters: ProjectChapterLike[]) {
  if (chapters.length > 1) return true;
  if (!chapters.length) return false;

  const onlyTitle = (chapters[0].chapterTitle || '').trim().toLowerCase();
  return onlyTitle !== 'full document (unstructured)';
}

function extractChaptersFromMetadata(metadataJson?: string | null): ProjectChapterLike[] {
  if (!metadataJson) return [];

  try {
    const parsed = JSON.parse(metadataJson);
    const chapters: Array<Record<string, unknown>> = Array.isArray(parsed?.chapters) ? parsed.chapters : [];
    return chapters
      .filter((chapter: Record<string, unknown>) => chapter && typeof chapter.chapterTitle === 'string')
      .map((chapter: Record<string, unknown>, index: number) => ({
        chapterNo: Number(chapter.chapterNo ?? index + 1),
        chapterTitle: String(chapter.chapterTitle || '').trim(),
        content: String(chapter.preview || chapter.content || '').trim(),
      }))
      .filter((chapter: ProjectChapterLike) => chapter.chapterTitle);
  } catch {
    return [];
  }
}

function resolveBestAvailableSourceText(project: {
  sourceText?: string | null;
  chapters: ProjectChapterLike[];
  tasks?: Array<{ activitySnapshots?: Array<{ metadataJson: string | null }> }>;
}) {
  const directSourceText = String(project.sourceText || '').trim();
  if (directSourceText) {
    return directSourceText;
  }

  if (isStructuredChapterSet(project.chapters)) {
    return rebuildSourceTextFromChapters(project.chapters);
  }

  for (const task of project.tasks || []) {
    for (const snapshot of task.activitySnapshots || []) {
      const snapshotChapters = extractChaptersFromMetadata(snapshot.metadataJson);
      if (isStructuredChapterSet(snapshotChapters)) {
        return rebuildSourceTextFromChapters(snapshotChapters);
      }
    }
  }

  return rebuildSourceTextFromChapters(project.chapters);
}

export class ProjectRerunError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ProjectRerunError';
    this.statusCode = statusCode;
  }
}

export async function restartProjectAnalysis(prisma: PrismaClient, projectId: string) {
  const project = await prisma.paperProject.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { orderIndex: 'asc' } },
      tasks: {
        orderBy: { startedAt: 'desc' },
        include: {
          activitySnapshots: {
            orderBy: { updatedAt: 'desc' },
          },
        },
      },
    },
  });

  if (!project) {
    throw new ProjectRerunError('Project not found.', 404);
  }

  const rawText = resolveBestAvailableSourceText(project).trim();
  if (!rawText.trim()) {
    throw new ProjectRerunError('No parsed chapter content found for this project.', 400);
  }

  if (!project.sourceText?.trim()) {
    await prisma.paperProject.update({
      where: { id: project.id },
      data: { sourceText: rawText },
    });
  }

  const task = await prisma.collaborationTask.create({
    data: {
      projectId: project.id,
      taskType: 'full_review',
      status: 'active',
      startedAt: new Date(),
    },
  });

  await activityService.initializeTask(task.id, {
    projectId: project.id,
    projectTitle: project.title,
    major: project.major || 'Unknown',
  });

  fullPaperReviewWorkflow.execute(task.id, rawText)
    .then(() => console.log(`Task ${task.id} review finished.`))
    .catch((err) => console.error(`Task ${task.id} review failed:`, err));

  return {
    message: 'Project re-analysis started successfully.',
    projectId: project.id,
    taskId: task.id,
  };
}
