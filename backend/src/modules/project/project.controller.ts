import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// Get all projects for dashboard
router.get('/', async (req, res) => {
  const projects = await prisma.paperProject.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { tasks: true }
  });
  res.json(projects);
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

export const projectRoutes = router;
