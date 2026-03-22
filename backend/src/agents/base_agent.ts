import { AgentName, AgentContribution } from '../engine/blackboard/blackboard.types';
import { LLMProvider, LLMMessage } from '../llm';

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
      "location": "string",
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
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are the ${this.agentName} in a Multi-Agent Paper Improvement System.
${this.roleDescription}
${this.schemaDefinition}`
      },
      {
        role: 'user',
        content: `Please analyze the following context for round ${round}, scope: ${scope}.
Context:
${context}`
      }
    ];

    try {
      // agentName string needs to upper case mapping for llm provider config, e.g. structure_agent -> STRUCTURE
      let configKey: keyof typeof import('../config/env').envConfig['Agents'];
      if(this.agentName === 'chief_editor') configKey = 'CHIEF';
      else configKey = this.agentName.split('_')[0].toUpperCase() as any;

      const rawResponse = await LLMProvider.chatCompletion(configKey, messages, true);
      // Ensure the returned JSON includes round/scope metadata explicitly
      return {
        ...rawResponse,
        agent_name: this.agentName,
        review_round: round,
        target_scope: scope
      } as AgentContribution;
    } catch (error) {
      console.error(`Agent ${this.agentName} failed to analyze: `, error);
      throw error;
    }
  }
}
