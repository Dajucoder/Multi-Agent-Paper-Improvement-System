import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { PDFParser } from '../../parser/pdf_parser';
import { DOCXParser } from '../../parser/docx_parser';
import { fullPaperReviewWorkflow } from '../../engine/workflows/full_paper_review.workflow';
import { activityService } from '../../engine/activity/activity.service';
import { AgentContribution } from '../../engine/blackboard/blackboard.types';
import { setReviewMaxConcurrency } from '../system/system.state';

const prisma = new PrismaClient();
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

async function createDemoProject() {
  const project = await prisma.paperProject.create({
    data: {
      title: '演示论文：面向论文改进的透明化多智能体协同系统',
      major: '计算机科学与技术',
      stage: 'draft',
    },
  });

  const task = await prisma.collaborationTask.create({
    data: {
      projectId: project.id,
      taskType: 'full_review',
      status: 'completed',
      startedAt: new Date(Date.now() - 1000 * 60 * 8),
      finishedAt: new Date(),
    },
  });

  const demoChapters = [
    {
      chapterNo: 0,
      chapterTitle: 'Abstract / Preliminaries',
      content: '本文研究如何通过透明化多智能体协同工作流提升 AI 辅助论文修改系统的可用性，使用户能够直观看到任务分发、专家发现以及总控汇总过程，从而增强信任感与可操作性。',
      summary: '摘要说明透明化多智能体工作流及其面向用户的可观察性价值。',
      orderIndex: 0,
    },
    {
      chapterNo: 1,
      chapterTitle: 'Introduction',
      content: '绪论部分介绍了透明化 AI 修改系统的研究动机，但在研究空白和评估边界尚未交代清楚前，过早强调了系统贡献，导致论证顺序略显突兀。',
      summary: '介绍研究背景、问题动机与系统贡献定位。',
      orderIndex: 1,
    },
    {
      chapterNo: 2,
      chapterTitle: 'Methodology',
      content: '方法章节描述了结构、逻辑、文献、写作四类智能体以及总控编辑的协同机制，但部分步骤尚未与后续评估指标形成严格映射。',
      summary: '介绍专家智能体、共享黑板和总控协同机制。',
      orderIndex: 2,
    },
    {
      chapterNo: 3,
      chapterTitle: 'Evaluation and Results',
      content: '实验与结果章节报告了用户信任度和修改效率的提升，但日志透明度、用户行为变化与结果指标之间的证据链仍不够严密。',
      summary: '说明实验设置、结果指标与用户反馈。',
      orderIndex: 3,
    },
  ];

  await prisma.paperChapter.createMany({
    data: demoChapters.map((chapter) => ({
      projectId: project.id,
      ...chapter,
    })),
  });

  await activityService.initializeTask(task.id, {
    projectId: project.id,
    projectTitle: project.title,
    major: project.major || 'Unknown',
  });

  await activityService.updateParseStage(task.id, 'parse', 'completed', '演示文本已从内置中文示例论文中解析完成。');
  await activityService.updateParseStage(task.id, 'split', 'completed', `演示论文已被切分为 ${demoChapters.length} 个章节块。`);
  await activityService.updateParseStage(task.id, 'dispatch', 'completed', '演示用专家审查结果已经生成，可直接浏览透明化分析过程。');
  await activityService.setChapterOutline(task.id, demoChapters.map((chapter) => ({
    chapterNo: chapter.chapterNo,
    chapterTitle: chapter.chapterTitle,
    content: chapter.content,
  })));
  await activityService.setPhase(task.id, '演示项目已就绪，可直接体验透明化流程');

  const demoContributions: AgentContribution[] = [
    {
      agent_name: 'structure_agent',
      review_round: 1,
      target_scope: 'full_paper',
      overall_judgement: 'major_issue',
      findings: [
        {
          issue_id: 'S001',
          issue_type: 'structure',
          severity: 'high',
          location: 'Chapter 1: Introduction',
          description: '绪论在研究空白和评估范围尚未交代清楚前就提前给出了核心贡献，影响了论证的铺垫顺序。',
          possible_root_cause: '章节组织优先强调贡献而非问题背景。',
          related_agent_findings: ['L001'],
        },
      ],
      suggestions: ['将核心贡献陈述后移到研究空白和问题定义之后。'],
      need_collaboration_with: ['literature_agent'],
    },
    {
      agent_name: 'logic_agent',
      review_round: 1,
      target_scope: 'full_paper',
      overall_judgement: 'major_issue',
      findings: [
        {
          issue_id: 'G001',
          issue_type: 'logic',
          severity: 'high',
          location: 'Chapter 3: Evaluation and Results',
          description: '用户信任度提升这一结论尚未与方法章节中的可观测干预路径形成严格对应。',
          possible_root_cause: '透明化功能与结果指标之间的证据链不完整。',
          related_agent_findings: ['W001'],
        },
      ],
      suggestions: ['补充从透明化功能到用户信任提升之间的明确因果桥接说明。'],
      need_collaboration_with: ['writing_agent'],
    },
    {
      agent_name: 'literature_agent',
      review_round: 1,
      target_scope: 'full_paper',
      overall_judgement: 'minor_issue',
      findings: [
        {
          issue_id: 'L001',
          issue_type: 'literature_gap',
          severity: 'medium',
          location: 'Chapter 1: Introduction',
          description: '绪论提到了透明化的优势，但缺少与传统黑箱式论文修改系统的充分对比。',
          possible_root_cause: '相关研究对比框架不够完整。',
          related_agent_findings: ['S001'],
        },
      ],
      suggestions: ['补充 2-3 篇对比透明审查系统与黑箱反馈系统的参考文献。'],
      need_collaboration_with: ['structure_agent'],
    },
    {
      agent_name: 'writing_agent',
      review_round: 1,
      target_scope: 'full_paper',
      overall_judgement: 'minor_issue',
      findings: [
        {
          issue_id: 'W001',
          issue_type: 'writing_clarity',
          severity: 'medium',
          location: 'Chapter 3: Evaluation and Results',
          description: '结果陈述与解释混写在同一段中，削弱了可读性和论证层次。',
          possible_root_cause: '证据展示与结果解读没有分层组织。',
          related_agent_findings: ['G001'],
        },
      ],
      suggestions: ['通过小节划分将原始结果展示与结果解释分开。'],
      need_collaboration_with: ['logic_agent'],
    },
  ];

  for (const contribution of demoContributions) {
    await activityService.setAgentStatus(task.id, contribution.agent_name, 'completed', contribution.overall_judgement);
    await activityService.addConversation(task.id, {
      round: 1,
      agentName: contribution.agent_name,
      direction: 'instruction',
      title: '演示任务已下发',
      detail: `系统已为 ${contribution.agent_name} 生成演示审查任务。`,
      promptSummary: '用于首次体验的演示型任务轨迹。',
      rawPayload: { target_scope: contribution.target_scope },
    });
    await activityService.addConversation(task.id, {
      round: 1,
      agentName: contribution.agent_name,
      direction: 'response',
      title: '演示结果已返回',
      detail: `当前可查看 ${contribution.findings.length} 条问题和 ${contribution.suggestions.length} 条建议。`,
      promptSummary: '用于首次体验的结构化演示结果。',
      rawPayload: contribution as unknown as Record<string, unknown>,
    });
    await activityService.addEvent(task.id, {
      kind: 'agent',
      phase: 'demo-review',
      round: 1,
      agentName: contribution.agent_name,
      title: `${contribution.agent_name} 演示结果已准备完成`,
      message: `已为 ${contribution.agent_name} 准备好演示型发现结果。`,
      severity: 'success',
      payload: {
        findingsCount: contribution.findings.length,
        suggestionsCount: contribution.suggestions.length,
      },
    });
    await activityService.recordContribution(task.id, contribution);
  }

  const chiefDecision = {
    overall_score: 82,
    root_cause_summary: '这篇论文的产品化构想较强，但绪论框架、方法说明与结果论证之间仍缺少更紧密的对齐，导致主张、证据与相关研究之间的支撑关系不够稳固。',
    conflicts_detected: [
      {
        topic: '结构智能体与文献智能体在绪论铺垫顺序上的交叉意见',
        resolution: '应先交代研究空白与对比背景，再提出系统贡献，以增强绪论的说服力。',
      },
      {
        topic: '逻辑智能体与写作智能体在实验结果表达上的交叉意见',
        resolution: '应将结果展示与结果解释分开，使“透明化提升信任”的论证路径更清晰可验证。',
      },
    ],
    revision_plan: [
      '先围绕研究空白重新组织绪论，再提出系统贡献。',
      '补充透明化审查系统与黑箱式修改系统的对比文献。',
      '明确说明透明化功能、日志可见性与用户信任提升之间的因果路径。',
      '在实验章节中分离原始结果展示与结果解释。',
    ],
    requires_another_round: false,
  };

  await activityService.setAgentStatus(task.id, 'chief_editor', 'completed', 'Unified demo diagnosis ready');
    await activityService.addConversation(task.id, {
      round: 1,
      agentName: 'chief_editor',
      direction: 'instruction',
      title: '演示汇总任务已下发',
      detail: '总控编辑收到四个专家智能体的演示审查结果，并开始生成统一判断。',
      promptSummary: '用于首次体验的总控演示汇总任务。',
      rawPayload: { contributionCount: demoContributions.length },
    });
    await activityService.addConversation(task.id, {
      round: 1,
      agentName: 'chief_editor',
      direction: 'response',
      title: '演示汇总结果已返回',
      detail: '总控编辑已经为演示论文生成根因总结和修订路线。',
      promptSummary: '用于首次体验的总控演示结果。',
      rawPayload: chiefDecision,
    });
  await activityService.recordChiefDecision(task.id, chiefDecision);
  await activityService.addEvent(task.id, {
    kind: 'chief',
    phase: 'demo-synthesis',
    round: 1,
    agentName: 'chief_editor',
    title: '演示项目总控结果已生成',
    message: '当前演示项目已经包含完整冲突图谱、章节轨迹与最终报告。',
    severity: 'success',
    payload: { overallScore: chiefDecision.overall_score },
  });

  await prisma.agentReviewRecord.createMany({
    data: demoContributions.map((contribution) => ({
      taskId: task.id,
      agentName: contribution.agent_name,
      reviewRound: 1,
      targetScope: contribution.target_scope,
      findingsJson: JSON.stringify(contribution),
    })),
  });

  const report = await prisma.diagnosisReport.create({
    data: {
      taskId: task.id,
      overallScore: chiefDecision.overall_score,
      rootCauseSummary: chiefDecision.root_cause_summary,
      revisionPlan: JSON.stringify(chiefDecision.revision_plan),
    },
  });

  await activityService.completeTask(task.id);

  return {
    project,
    task,
    report,
  };
}

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (req.body.reviewMaxConcurrency) {
      setReviewMaxConcurrency(Number(req.body.reviewMaxConcurrency));
    }

    // Attempt to parse based on mimetype
    let rawText = '';
    if (file.mimetype === 'application/pdf') {
      rawText = await PDFParser.parseBuffer(file.buffer);
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      rawText = await DOCXParser.parseBuffer(file.buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Only PDF/DOCX allowed.' });
    }

    // 1. Create a simple project record
    const title = req.body.title || file.originalname.split('.')[0] || 'Untitled Paper';
    const project = await prisma.paperProject.create({
      data: {
        title: title,
        major: req.body.major || 'Unknown',
        stage: 'draft',
      }
    });

    // 2. Create the collaboration task
    const task = await prisma.collaborationTask.create({
      data: {
        projectId: project.id,
        taskType: 'full_review',
        status: 'active',
        startedAt: new Date(),
      }
    });

    await activityService.initializeTask(task.id, {
      projectId: project.id,
      projectTitle: project.title,
      major: project.major || 'Unknown',
    });

    // 3. Fire-and-forget the workflow processing to run asynchronously 
    // In a production environment, use queues (e.g. BullMQ, RabbitMQ)
    fullPaperReviewWorkflow.execute(task.id, rawText)
      .then(result => console.log(`Task ${task.id} review finished.`))
      .catch(err => console.error(`Task ${task.id} review failed:`, err));

    return res.json({ 
      message: 'File uploaded and multi-agent review initiated successfully.',
      projectId: project.id,
      taskId: task.id
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

router.post('/demo', async (_req, res) => {
  try {
    const { project, task, report } = await createDemoProject();
    return res.json({
      message: '演示项目创建成功。',
      projectId: project.id,
      taskId: task.id,
      reportId: report.id,
    });
  } catch (error: any) {
    console.error('Demo Project Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create demo project.' });
  }
});

export const uploadRoutes = router;
