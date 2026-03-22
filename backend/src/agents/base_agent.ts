import { AgentName, AgentContribution } from '../engine/blackboard/blackboard.types';
import { LLMProvider, LLMMessage } from '../llm';
import { activityService } from '../engine/activity/activity.service';

export abstract class BaseAgent {
  readonly agentName: AgentName;
  readonly roleDescription: string;
  readonly schemaDefinition: string;

  constructor(agentName: AgentName, roleDescription: string) {
    this.agentName = agentName;
    this.roleDescription = roleDescription;
    this.schemaDefinition = `
Output MUST strict match this JSON format:
{
  "agent_name": "${this.agentName || 'unknown'}",
  "review_round": 1,
  "target_scope": "chapter_or_full_paper",
  "overall_judgement": "major_issue/minor_issue/no_issue",
  "findings": [
    {
      "issue_id": "unique_code_e.g_S001",
      "issue_type": "string",
      "severity": "high/medium/low",
      "location": "Use exact chapter reference format: \"Chapter <number>: <title>\" or \"Abstract / Preliminaries\"",
      "description": "string",
      "possible_root_cause": "string",
      "related_agent_findings": []
    }
  ],
  "suggestions": ["suggestion 1"],
  "need_collaboration_with": ["other_agent_name"]
}
`;
  }

  async analyze(context: string, round: number, scope: string): Promise<AgentContribution> {
    if (this.currentTaskId) {
      await activityService.setAgentStatus(this.currentTaskId, this.agentName, 'running', `Reviewing ${scope.replace('_', ' ')} content`);
    }

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are the ${this.agentName} in a Multi-Agent Paper Improvement System.
${this.roleDescription}
Additional requirements:
- All output content MUST be written in Chinese, including finding descriptions, root causes, and suggestions.
- Every finding MUST include a normalized chapter location.
- If the issue belongs to a chapter, set \"location\" to exactly \"Chapter <number>: <title>\".
- If the issue belongs to the front matter, set \"location\" to exactly \"Abstract / Preliminaries\".
- Do not use vague locations such as \"middle section\", \"later part\", or \"results area\".
${this.schemaDefinition}`
      },
      {
        role: 'user',
        content: `Please analyze the following context for round ${round}, scope: ${scope}.
Context:
${context}`
      }
    ];

    if (this.currentTaskId) {
      await activityService.addConversation(this.currentTaskId, {
        round,
        agentName: this.agentName,
        direction: 'instruction',
        title: 'Prompt issued',
        detail: `Analyze ${scope} content for round ${round}. Context length: ${context.length} characters.`,
        promptSummary: `Specialist prompt for ${scope} review in round ${round}.`,
        rawPayload: {
          scope,
          round,
          contextLength: context.length,
        },
      });
    }

    try {
      // agentName string needs to upper case mapping for llm provider config, e.g. structure_agent -> STRUCTURE
      let configKey: keyof typeof import('../config/env').envConfig['Agents'];
      if(this.agentName === 'chief_editor') configKey = 'CHIEF';
      else configKey = this.agentName.split('_')[0].toUpperCase() as any;

      const rawResponse = await LLMProvider.chatCompletion(configKey, messages, true);
      // Ensure the returned JSON includes round/scope metadata explicitly
      const contribution = {
        ...rawResponse,
        agent_name: this.agentName,
        review_round: round,
        target_scope: scope
      } as AgentContribution;

      if (this.currentTaskId) {
        await activityService.addConversation(this.currentTaskId, {
          round,
          agentName: this.agentName,
          direction: 'response',
          title: 'Structured findings returned',
          detail: `Judgement: ${contribution.overall_judgement}. Findings: ${contribution.findings?.length || 0}. Suggestions: ${contribution.suggestions?.length || 0}.`,
          promptSummary: 'Specialist agent returned a structured review object.',
          rawPayload: contribution as unknown as Record<string, unknown>,
        });
        await activityService.addEvent(this.currentTaskId, {
          kind: 'agent',
          phase: 'parallel-review',
          round,
          agentName: this.agentName,
          title: `${this.agentName} submitted findings`,
          message: `Completed analysis with ${contribution.findings?.length || 0} findings and ${contribution.suggestions?.length || 0} suggestions.`,
          severity: 'success',
          payload: {
            overallJudgement: contribution.overall_judgement,
            findingsCount: contribution.findings?.length || 0,
            suggestionsCount: contribution.suggestions?.length || 0,
            collaborators: contribution.need_collaboration_with || [],
          },
        });
        await activityService.recordContribution(this.currentTaskId, contribution);
      }

      return contribution;
    } catch (error) {
      console.error(`Agent ${this.agentName} failed to analyze: `, error);
      if (this.currentTaskId) {
        await activityService.setAgentStatus(this.currentTaskId, this.agentName, 'failed', 'Analysis failed');
        const errorMessage = error instanceof Error ? error.message : 'Unknown analysis error';
        const friendlyMessage = /449|429|rate limit|too many requests/i.test(errorMessage)
          ? `模型接口当前限流，${this.agentName} 在自动重试后仍未成功。请稍后重试。`
          : errorMessage;
        await activityService.addEvent(this.currentTaskId, {
          kind: 'agent',
          phase: 'parallel-review',
          round,
          agentName: this.agentName,
          title: `${this.agentName} failed`,
          message: friendlyMessage,
          severity: 'error',
          payload: null,
        });
      }
      throw error;
    }
  }

  private currentTaskId: string | null = null;

  setTaskContext(taskId: string | null) {
    this.currentTaskId = taskId;
  }
}
