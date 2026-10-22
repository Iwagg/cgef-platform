import type { ComplianceRequirement, Risk } from './db-types';

export interface FrameworkStats {
  framework: string;
  total: number;
  compliant: number;
  partial: number;
  gap: number;
  na: number;
  percentage: number;
}

/** Readiness = (compliant + ½ partial) / applicable requirements. */
export function frameworkStats(requirements: ComplianceRequirement[], framework: string): FrameworkStats {
  const items = requirements.filter((r) => r.framework === framework);
  const count = (s: string) => items.filter((r) => r.status === s).length;
  const compliant = count('compliant');
  const partial = count('partial');
  const gap = count('gap');
  const na = count('na');
  const applicable = items.length - na;
  return {
    framework,
    total: items.length,
    compliant, partial, gap, na,
    percentage: applicable > 0 ? Math.round(((compliant + partial * 0.5) / applicable) * 100) : 0,
  };
}

/** 5×5 counts of open risks; row 0 = impact 5, column 0 = likelihood 1. */
export function riskMatrix(risks: Risk[]): number[][] {
  const m = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
  risks.filter((r) => r.status !== 'closed').forEach((r) => { m[5 - r.impact][r.likelihood - 1]++; });
  return m;
}

/** "Gestion des Risques Cyber" → "Risques Cyber", "Gouvernance & Leadership" → "Gouvernance" (radar labels). */
export const shortPillarName = (name: string) => name.split(' & ')[0].split(' (')[0].replace('Gestion des ', '');

export const FRAMEWORK_COLORS: Record<string, string> = {
  'ISO 27001': '#3b82f6',
  NIS2: '#06b6d4',
  DORA: '#a855f7',
  RGPD: '#22c55e',
  'NIST CSF': '#f59e0b',
  'CIS Controls': '#6366f1',
  'SOC 2': '#ec4899',
  'PCI-DSS': '#eab308',
};
