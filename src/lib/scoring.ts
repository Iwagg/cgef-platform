import type { CGSTier, PillarId, ScoreResult, AssessmentResponse } from './types';
import { PILLARS, PROCESSES } from './cgef-framework';

export function computeCGSTier(score: number): CGSTier {
  if (score >= 4.5) return 'AAA';
  if (score >= 4.0) return 'AA';
  if (score >= 3.5) return 'A';
  if (score >= 3.0) return 'BBB';
  if (score >= 2.5) return 'BB';
  return 'B';
}

export function computeCMI(score: number): number {
  return Math.round(((score - 1) / 4) * 100);
}

export function computeScore(responses: AssessmentResponse[]): ScoreResult {
  const pillarScores: Record<PillarId, number> = {
    P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0, P7: 0, P8: 0,
  };

  const pillarCounts: Record<PillarId, number> = {
    P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0, P7: 0, P8: 0,
  };

  responses.forEach((response) => {
    const process = PROCESSES.find((p) => p.id === response.process_id);
    if (process) {
      pillarScores[process.pillarId] += response.maturity_level;
      pillarCounts[process.pillarId]++;
    }
  });

  PILLARS.forEach((pillar) => {
    if (pillarCounts[pillar.id] > 0) {
      pillarScores[pillar.id] = pillarScores[pillar.id] / pillarCounts[pillar.id];
    }
  });

  let globalScore = 0;
  PILLARS.forEach((pillar) => {
    globalScore += pillarScores[pillar.id] * pillar.weight;
  });

  const equivalenceApplies = PILLARS.every(
    (pillar) => pillarScores[pillar.id] >= 3.0
  );

  const totalProcesses = PROCESSES.length;
  const completionRate = (responses.length / totalProcesses) * 100;

  return {
    globalScore: Math.round(globalScore * 100) / 100,
    cgsTier: computeCGSTier(globalScore),
    cmiIndex: computeCMI(globalScore),
    pillarScores,
    equivalenceApplies,
    completionRate: Math.round(completionRate),
  };
}

export function getCGSTierColor(tier: CGSTier): string {
  const colors: Record<CGSTier, string> = {
    AAA: '#1565C0',
    AA: '#2E7D32',
    A: '#43A047',
    BBB: '#FDD835',
    BB: '#F57C00',
    B: '#D32F2F',
  };
  return colors[tier];
}

export function getCGSTierLabel(tier: CGSTier): string {
  const labels: Record<CGSTier, string> = {
    AAA: 'Excellence',
    AA: 'Tres bien',
    A: 'Bien',
    BBB: 'Satisfaisant',
    BB: 'A ameliorer',
    B: 'Insuffisant',
  };
  return labels[tier];
}

export function computeFrameworkCoverage(
  responses: AssessmentResponse[],
  frameworkId: string
): number {
  const relevantProcesses = PROCESSES.filter(
    (p) => p.regulatoryMappings[frameworkId]?.length
  );

  if (relevantProcesses.length === 0) return 0;

  const evaluatedProcesses = relevantProcesses.filter((process) =>
    responses.some(
      (r) => r.process_id === process.id && r.maturity_level >= 3
    )
  );

  return Math.round((evaluatedProcesses.length / relevantProcesses.length) * 100);
}
