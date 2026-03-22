import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { PDFParser } from '../../parser/pdf_parser';
import { DOCXParser } from '../../parser/docx_parser';
import { fullPaperReviewWorkflow } from '../../engine/workflows/full_paper_review.workflow';

const prisma = new PrismaClient();
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
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

export const uploadRoutes = router;
