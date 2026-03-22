import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { activityService } from '../../engine/activity/activity.service';
import { getReviewMaxConcurrency } from '../system/system.state';
import JSZip from 'jszip';

const prisma = new PrismaClient();
const router = Router();

// Get all projects for dashboard
router.get('/', async (req, res) => {
  const projects = await prisma.paperProject.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { tasks: true }
  });

  const enrichedProjects = await Promise.all(projects.map(async (project) => {
    const latestTask = [...project.tasks].sort((a, b) => {
      return new Date(b.startedAt || b.finishedAt || 0).getTime() - new Date(a.startedAt || a.finishedAt || 0).getTime();
    })[0];

    let transparency = null;
    if (latestTask) {
      try {
        await activityService.hydrateTask(latestTask.id, {
          projectId: project.id,
          projectTitle: project.title,
          major: project.major || 'Unknown',
        });
        transparency = activityService.createSnapshot(latestTask.id);
      } catch {
        transparency = null;
      }
    }

    return {
      ...project,
      latestTask,
      transparency,
    };
  }));

  res.json(enrichedProjects);
});

router.get('/:projectId/progress', async (req, res) => {
  const { projectId } = req.params;

  const project = await prisma.paperProject.findUnique({
    where: { id: projectId },
    include: {
      chapters: {
        orderBy: { orderIndex: 'asc' },
      },
      tasks: {
        orderBy: { startedAt: 'desc' },
      },
    },
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const latestTask = project.tasks[0];
  if (!latestTask) {
    return res.status(404).json({ error: 'No collaboration task found for this project.' });
  }

  let snapshot;
  try {
    await activityService.hydrateTask(latestTask.id, {
      projectId: project.id,
      projectTitle: project.title,
      major: project.major || 'Unknown',
    });
    snapshot = activityService.createSnapshot(latestTask.id);
  } catch {
    snapshot = null;
  }

  const agentRecords = await prisma.agentReviewRecord.findMany({
    where: { taskId: latestTask.id },
    orderBy: { createdAt: 'asc' },
  });

  const report = await prisma.diagnosisReport.findFirst({
    where: { taskId: latestTask.id },
    orderBy: { createdAt: 'desc' },
  });

  const fallbackFindings = agentRecords.map((record) => {
    try {
      return JSON.parse(record.findingsJson);
    } catch {
      return {
        agent_name: record.agentName,
        review_round: record.reviewRound,
        target_scope: record.targetScope,
        overall_judgement: 'unknown',
        findings: [],
        suggestions: [],
      };
    }
  });

  const resolvedSnapshot = snapshot
    ? activityService.createSnapshot(latestTask.id)
    : {
        taskId: latestTask.id,
        projectId: project.id,
        projectTitle: project.title,
        major: project.major || 'Unknown',
        status: latestTask.status,
        phase: latestTask.status === 'completed' ? 'Final report ready' : 'Task created',
        currentRound: latestTask.currentRound,
        startedAt: latestTask.startedAt,
        finishedAt: latestTask.finishedAt,
        progressPercent: latestTask.status === 'completed' ? 100 : 15,
        agents: [],
        events: [],
        conversations: [],
        findings: fallbackFindings,
        chiefDecision: report
          ? (() => {
              try {
                return {
                  overall_score: report.overallScore,
                  root_cause_summary: report.rootCauseSummary,
                  revision_plan: report.revisionPlan ? JSON.parse(report.revisionPlan) : [],
                };
              } catch {
                return {
                  overall_score: report.overallScore,
                  root_cause_summary: report.rootCauseSummary,
                  revision_plan: [],
                };
              }
            })()
          : null,
      };

  return res.json({
    project: {
      id: project.id,
      title: project.title,
      major: project.major,
      stage: project.stage,
      status: project.status,
      chapters: project.chapters,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    task: latestTask,
    snapshot: resolvedSnapshot,
  });
});

router.get('/:projectId/chapters/:chapterNo', async (req, res) => {
  const { projectId, chapterNo } = req.params;

  const project = await prisma.paperProject.findUnique({
    where: { id: projectId },
    include: {
      chapters: { orderBy: { orderIndex: 'asc' } },
      tasks: { orderBy: { startedAt: 'desc' }, take: 1 },
    },
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const chapter = project.chapters.find((item) => String(item.chapterNo) === String(chapterNo));
  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found.' });
  }

  const latestTask = project.tasks[0];
  let snapshot = null;
  if (latestTask) {
    try {
      await activityService.hydrateTask(latestTask.id, {
        projectId: project.id,
        projectTitle: project.title,
        major: project.major || 'Unknown',
      });
      snapshot = activityService.createSnapshot(latestTask.id);
    } catch {
      snapshot = null;
    }
  }

  const chapterKey = chapter.chapterNo === 0 ? 'Abstract / Preliminaries' : `Chapter ${chapter.chapterNo}: ${chapter.chapterTitle}`;
  const chapterFindings = (snapshot?.findings || []).map((finding: any) => ({
    ...finding,
    findings: (finding.findings || []).filter((issue: any) => issue.location === chapterKey || issue.location === chapter.chapterTitle),
  })).filter((finding: any) => finding.findings.length > 0);

  const conflictEdges = (snapshot?.metadata?.conflictGraph || []).filter((edge: any) =>
    (edge.locations || []).some((location: string) => location === chapterKey || location === chapter.chapterTitle)
  );

  return res.json({
    project: {
      id: project.id,
      title: project.title,
      major: project.major,
    },
    chapter,
    chapterKey,
    findings: chapterFindings,
    conflicts: conflictEdges,
    snapshot,
  });
});

router.get('/:projectId/stream', async (req, res) => {
  const { projectId } = req.params;

  const project = await prisma.paperProject.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        orderBy: { startedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!project || project.tasks.length === 0) {
    return res.status(404).json({ error: 'Project or latest task not found.' });
  }

  const task = project.tasks[0];
  await activityService.hydrateTask(task.id, {
    projectId: project.id,
    projectTitle: project.title,
    major: project.major || 'Unknown',
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendSnapshot = (snapshotPayload: ReturnType<typeof activityService.createSnapshot>) => {
    res.write(`event: snapshot\n`);
    res.write(`data: ${JSON.stringify(snapshotPayload)}\n\n`);
  };

  sendSnapshot(activityService.createSnapshot(task.id));

  const unsubscribe = activityService.subscribe(task.id, sendSnapshot);
  const heartbeat = setInterval(() => {
    res.write(`event: ping\n`);
    res.write(`data: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

// Get a specific project diagnosis report
router.get('/:projectId/report', async (req, res) => {
  const { projectId } = req.params;
  
  const tasks = await prisma.collaborationTask.findMany({
    where: { projectId, status: 'completed' },
    orderBy: { finishedAt: 'desc' },
    take: 1
  });

  if (tasks.length === 0) {
    return res.status(404).json({ error: 'No completed review tasks found for this project.' });
  }

  const latestTask = tasks[0];

  const report = await prisma.diagnosisReport.findFirst({
    where: { taskId: latestTask.id }
  });

  const agentRecords = await prisma.agentReviewRecord.findMany({
    where: { taskId: latestTask.id }
  });

  res.json({
    task: latestTask,
    report,
    agentFindings: agentRecords
  });
});

router.get('/:projectId/report/export', async (req, res) => {
  const { projectId } = req.params;
  const format = String(req.query.format || 'markdown');

  const project = await prisma.paperProject.findUnique({ where: { id: projectId } });
  const tasks = await prisma.collaborationTask.findMany({
    where: { projectId, status: 'completed' },
    orderBy: { finishedAt: 'desc' },
    take: 1,
  });

  if (!project || tasks.length === 0) {
    return res.status(404).json({ error: 'No completed project report found.' });
  }

  const latestTask = tasks[0];
  const report = await prisma.diagnosisReport.findFirst({ where: { taskId: latestTask.id } });
  const agentRecords = await prisma.agentReviewRecord.findMany({ where: { taskId: latestTask.id } });

  const findings = agentRecords.map((record) => {
    try {
      return JSON.parse(record.findingsJson);
    } catch {
      return null;
    }
  }).filter(Boolean);

  const revisionPlan = (() => {
    try {
      return report?.revisionPlan ? JSON.parse(report.revisionPlan) : [];
    } catch {
      return [];
    }
  })();

  const markdown = [
    `# ${project.title}`,
    '',
    `- 专业：${project.major || '未知'}`,
    `- 总分：${report?.overallScore ?? 'N/A'}`,
    `- 评审并发：${getReviewMaxConcurrency()}`,
    '',
    '## 根因总结',
    report?.rootCauseSummary || '暂无根因总结。',
    '',
    '## 修订计划',
    ...(revisionPlan.length ? revisionPlan.map((step: string, index: number) => `${index + 1}. ${step}`) : ['暂无修订计划。']),
    '',
    '## 智能体发现',
    ...findings.flatMap((finding: any) => [
      `### ${finding.agent_name}`,
      ...(finding.findings?.length
        ? finding.findings.map((issue: any) => `- [${issue.severity}] ${issue.issue_type}: ${issue.description} (${issue.location || '未定位'})`)
        : ['- 无显式问题']),
      ...(finding.suggestions?.length
        ? ['建议：', ...finding.suggestions.map((item: string) => `- ${item}`)]
        : []),
      '',
    ]),
  ].join('\n');

  if (format === 'txt') {
    return res.type('text/plain').send(markdown.replace(/^#+\s?/gm, '').replace(/^-\s\[(.*?)\]\s/gm, '- '));
  }

  if (format === 'docx') {
    const zip = new JSZip();
    const plainText = markdown.replace(/^#+\s?/gm, '').replace(/^-\s\[(.*?)\]\s/gm, '- ');
    const paragraphs = plainText
      .split('\n')
      .filter(Boolean)
      .map((line) => `<w:p><w:r><w:t xml:space="preserve">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>`)
      .join('');

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`);
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);
    zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${project.title}</dc:title></cp:coreProperties>`);
    zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Multi-Agent Paper Improvement System</Application></Properties>`);

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(project.title)}.docx"`);
    return res.send(buffer);
  }

  return res.type('text/markdown').send(markdown);
});

export const projectRoutes = router;
