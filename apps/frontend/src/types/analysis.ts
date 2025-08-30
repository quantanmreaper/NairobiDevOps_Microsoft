/**
 * Type definitions for repository analysis results
 * These match the backend AnalysisResult interface
 */

export interface AnalysisResult {
  repository: {
    name: string;
    url: string;
    language: string;
  };
  dependencies: {
    total: number;
    outdated: Array<{
      name: string;
      current: string;
      latest: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    vulnerable: Array<{
      name: string;
      version: string;
      vulnerability: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  };
  staticAnalysis: {
    errors: Array<{
      file: string;
      line: number;
      message: string;
      severity: 'error' | 'warning' | 'info';
      rule?: string;
    }>;
    summary: {
      totalFiles: number;
      totalErrors: number;
      totalWarnings: number;
    };
  };
  aiSummary: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
    recommendations: string[];
    priorityFixes: string[];
  };
}