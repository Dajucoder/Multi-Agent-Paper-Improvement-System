import { AgentContribution } from '../blackboard/blackboard.types';

export type SpecialistAgentId = 'structure_agent' | 'logic_agent' | 'literature_agent' | 'writing_agent';

export interface ReinforcementPolicyState {
  epsilon: number;
  alpha: number;
  rewardThreshold: number;
  qValues: Record<SpecialistAgentId, number>;
  focusSignals: string[];
  rewardHistory: number[];
}

export interface DecisionLike {
  overall_score?: number;
  conflicts_detected?: Array<{ topic?: string; resolution?: string }>;
  revision_plan?: string[];
  requires_another_round?: boolean;
}

const DEFAULT_Q_VALUES: Record<SpecialistAgentId, number> = {
  structure_agent: 0.5,
  logic_agent: 0.5,
  literature_agent: 0.5,
  writing_agent: 0.5,
};

export class ReinforcementPolicyService {
  initialize(options: { epsilon: number; alpha: number; rewardThreshold: number }): ReinforcementPolicyState {
    return {
      epsilon: this.clamp(options.epsilon, 0.02, 0.6),
      alpha: this.clamp(options.alpha, 0.05, 0.9),
      rewardThreshold: this.clamp(options.rewardThreshold, 0.2, 0.95),
      qValues: { ...DEFAULT_Q_VALUES },
      focusSignals: [],
      rewardHistory: [],
    };
  }

  rankAgents(policy: ReinforcementPolicyState): SpecialistAgentId[] {
    const ordered = (Object.keys(policy.qValues) as SpecialistAgentId[])
      .sort((a, b) => policy.qValues[b] - policy.qValues[a]);

    // epsilon-greedy exploration: swap top-2 sometimes to diversify exploration.
    if (Math.random() < policy.epsilon && ordered.length >= 2) {
      const [a, b] = ordered;
      ordered[0] = b;
      ordered[1] = a;
    }

    return ordered;
  }

  computeReward(decision: DecisionLike, contributions: AgentContribution[]): number {
    const normalizedScore = this.clamp((decision.overall_score ?? 0) / 100, 0, 1);
    const conflictPenalty = Math.min((decision.conflicts_detected?.length || 0) * 0.08, 0.32);
    const majorIssuePenalty = Math.min(
      contributions.filter((item) => String(item.overall_judgement).toLowerCase() === 'major_issue').length * 0.06,
      0.24,
    );
    const revisionPlanBonus = Math.min((decision.revision_plan?.length || 0) * 0.015, 0.12);

    return this.clamp(normalizedScore - conflictPenalty - majorIssuePenalty + revisionPlanBonus, 0, 1);
  }

  updatePolicy(
    policy: ReinforcementPolicyState,
    reward: number,
    contributions: AgentContribution[],
    decision: DecisionLike,
  ): ReinforcementPolicyState {
    const nextQ = { ...policy.qValues };

    for (const contribution of contributions) {
      const agent = contribution.agent_name as SpecialistAgentId;
      if (!nextQ[agent]) continue;

      const severityImpact = this.calculateSeverityImpact(contribution);
      const localReward = this.clamp(reward - severityImpact, 0, 1);
      nextQ[agent] = this.clamp(nextQ[agent] + policy.alpha * (localReward - nextQ[agent]), 0.05, 0.98);
    }

    const rewardHistory = [...policy.rewardHistory, reward].slice(-20);

    return {
      ...policy,
      qValues: nextQ,
      rewardHistory,
      focusSignals: this.extractFocusSignals(contributions, decision),
    };
  }

  shouldContinue(policy: ReinforcementPolicyState, reward: number, round: number, maxRounds: number, decision: DecisionLike): boolean {
    if (round >= maxRounds) return false;
    if (decision.requires_another_round) return true;
    return reward < policy.rewardThreshold;
  }

  buildPolicyHint(policy: ReinforcementPolicyState, agent: SpecialistAgentId, round: number): string {
    const q = policy.qValues[agent] ?? 0.5;
    const focus = policy.focusSignals.slice(0, 4);
    const focusBlock = focus.length
      ? `\n重点关注信号: ${focus.join('；')}`
      : '';

    return [
      `【调度策略信息】当前第 ${round} 轮。`,
      `你在当前轮次的优先分值为 ${q.toFixed(2)}（范围 0-1，越高表示越关键）。`,
      '请在保持 JSON 结构不变前提下，优先输出高影响问题并尽量指出可验证证据链。',
      focusBlock,
    ].join('\n');
  }

  private calculateSeverityImpact(contribution: AgentContribution): number {
    const findings = contribution.findings || [];
    let impact = 0;
    for (const finding of findings) {
      if (finding.severity === 'high') impact += 0.08;
      if (finding.severity === 'medium') impact += 0.04;
      if (finding.severity === 'low') impact += 0.015;
    }
    return Math.min(impact, 0.4);
  }

  private extractFocusSignals(contributions: AgentContribution[], decision: DecisionLike): string[] {
    const signals: string[] = [];

    for (const contribution of contributions) {
      for (const finding of contribution.findings || []) {
        if (finding.location) signals.push(finding.location);
        if (finding.issue_type) signals.push(finding.issue_type);
      }
    }

    for (const conflict of decision.conflicts_detected || []) {
      if (conflict.topic) signals.push(conflict.topic);
    }

    return Array.from(new Set(signals)).slice(0, 12);
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }
}

export const reinforcementPolicyService = new ReinforcementPolicyService();
