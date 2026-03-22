import { blackboard } from '../blackboard/blackboard.service';
import { chiefEditor } from '../orchestrator/chief_editor';
import { structureAgent } from '../../agents/structure_agent';
import { logicAgent } from '../../agents/logic_agent';
import { literatureAgent } from '../../agents/literature_agent';
import { writingAgent } from '../../agents/writing_agent';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FullPaperReviewWorkflow {
  /**
   * Orchestrates the standard full paper review multi-agent workflow
   */
  async execute(taskId: string, paperText: string) {
    console.log(`[Workflow] Starting full paper review for task ${taskId}`);
    
    // Simulate parsing/chunking context 
    // In production we would use `ChapterSplitter.splitRawText`
    const context = paperText.substring(0, 15000); // chunking simplified for MVP

    const state = blackboard.initializeTask(taskId, {
      title: 'Full Paper Context',
      abstract: context.substring(0, 1000)
    });

    try {
      // Parallel Phase: All agents review independently
      console.log(`[Workflow] Round 1: Parallel Review Started...`);
      const round = state.currentRound;

      const [structureFindings, logicFindings, literatureFindings, writingFindings] = await Promise.all([
        structureAgent.analyze(context, round, 'full_paper'),
        logicAgent.analyze(context, round, 'full_paper'),
        literatureAgent.analyze(context, round, 'full_paper'),
        writingAgent.analyze(context, round, 'full_paper')
      ]);

      // Submit to blackboard
      blackboard.submitContribution(taskId, round, structureFindings);
      blackboard.submitContribution(taskId, round, logicFindings);
      blackboard.submitContribution(taskId, round, literatureFindings);
      blackboard.submitContribution(taskId, round, writingFindings);

      // Save raw findings to DB
      await prisma.agentReviewRecord.createMany({
        data: [
          { taskId, agentName: 'structure_agent', reviewRound: round, targetScope: 'full_paper', findingsJson: JSON.stringify(structureFindings) },
          { taskId, agentName: 'logic_agent', reviewRound: round, targetScope: 'full_paper', findingsJson: JSON.stringify(logicFindings) },
          { taskId, agentName: 'literature_agent', reviewRound: round, targetScope: 'full_paper', findingsJson: JSON.stringify(literatureFindings) },
          { taskId, agentName: 'writing_agent', reviewRound: round, targetScope: 'full_paper', findingsJson: JSON.stringify(writingFindings) },
        ]
      });

      // Synchronize / Resolve Phase
      console.log(`[Workflow] Chief Editor reviewing findings...`);
      const finalDecision = await chiefEditor.synthesizeAndDecide(taskId);

      // Update Task Status
      await prisma.collaborationTask.update({
        where: { id: taskId },
        data: { status: 'completed', finishedAt: new Date() }
      });

      // Create Report
      const report = await prisma.diagnosisReport.create({
        data: {
          taskId,
          overallScore: finalDecision.overall_score || 0,
          rootCauseSummary: finalDecision.root_cause_summary || '',
          revisionPlan: JSON.stringify(finalDecision.revision_plan || []),
        }
      });

      return {
        status: 'success',
        reportId: report.id,
        summary: finalDecision
      };

    } catch (error) {
      console.error(`[Workflow] Error in full paper review task ${taskId}:`, error);
      
      await prisma.collaborationTask.update({
        where: { id: taskId },
        data: { status: 'failed' }
      });
      throw error;
    }
  }
}

export const fullPaperReviewWorkflow = new FullPaperReviewWorkflow();
