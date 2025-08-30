import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';
import axios from 'axios';

export interface DependencyAnalysis {
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
}

/**
 * Analyze dependencies for outdated packages and known vulnerabilities
 */
export async function analyzeDependencies(repoPath: string, language: string): Promise<DependencyAnalysis> {
  switch (language) {
    case 'javascript':
      return analyzeJavaScriptDependencies(repoPath);
    case 'python':
      return analyzePythonDependencies(repoPath);
    default:
      return {
        total: 0,
        outdated: [],
        vulnerable: []
      };
  }
}

/**
 * Analyze JavaScript/Node.js dependencies from package.json
 */
async function analyzeJavaScriptDependencies(repoPath: string): Promise<DependencyAnalysis> {
  const packageJsonPath = path.join(repoPath, 'package.json');
  
  if (!await fs.pathExists(packageJsonPath)) {
    return { total: 0, outdated: [], vulnerable: [] };
  }

  const packageJson = await fs.readJson(packageJsonPath);
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const total = Object.keys(dependencies).length;
  const outdated: DependencyAnalysis['outdated'] = [];
  const vulnerable: DependencyAnalysis['vulnerable'] = [];

  // Check each dependency (using mock data for demo)
  for (const [name, version] of Object.entries(dependencies)) {
    const currentVersion = (version as string).replace(/[\^~]/, '');
    
    // Mock outdated check (in real implementation, use npm registry API)
    const mockLatestVersions: Record<string, string> = {
      'express': '4.18.2',
      'lodash': '4.17.21',
      'axios': '1.5.0',
      'react': '18.2.0',
      'vue': '3.3.4',
      'bcrypt': '5.1.0'
    };

    const latestVersion = mockLatestVersions[name];
    if (latestVersion && semver.lt(currentVersion, latestVersion)) {
      const severity = semver.major(currentVersion) < semver.major(latestVersion) ? 'high' :
                      semver.minor(currentVersion) < semver.minor(latestVersion) ? 'medium' : 'low';
      
      outdated.push({
        name,
        current: currentVersion,
        latest: latestVersion,
        severity
      });
    }

    // Mock vulnerability check (in real implementation, use security databases)
    const mockVulnerabilities: Record<string, { vulnerability: string; severity: any }> = {
      'lodash': {
        vulnerability: 'Prototype Pollution (CVE-2019-10744)',
        severity: 'high'
      },
      'express': {
        vulnerability: 'Open Redirect (CVE-2022-24999)',
        severity: 'medium'
      },
      'bcrypt': {
        vulnerability: 'Timing Attack Vulnerability',
        severity: 'medium'
      }
    };

    const vuln = mockVulnerabilities[name];
    if (vuln) {
      vulnerable.push({
        name,
        version: currentVersion,
        vulnerability: vuln.vulnerability,
        severity: vuln.severity
      });
    }
  }

  return { total, outdated, vulnerable };
}

/**
 * Analyze Python dependencies from requirements.txt
 */
async function analyzePythonDependencies(repoPath: string): Promise<DependencyAnalysis> {
  const requirementsPath = path.join(repoPath, 'requirements.txt');
  
  if (!await fs.pathExists(requirementsPath)) {
    return { total: 0, outdated: [], vulnerable: [] };
  }

  const requirementsContent = await fs.readFile(requirementsPath, 'utf-8');
  const lines = requirementsContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  const total = lines.length;
  const outdated: DependencyAnalysis['outdated'] = [];
  const vulnerable: DependencyAnalysis['vulnerable'] = [];

  // Parse requirements and check for outdated/vulnerable packages
  for (const line of lines) {
    const match = line.match(/^([a-zA-Z0-9\-_]+)([>=<~!]+)?(.+)?$/);
    if (!match) continue;

    const [, name, operator, version] = match;
    const currentVersion = version || '0.0.0';

    // Mock data for Python packages
    const mockLatestVersions: Record<string, string> = {
      'django': '4.2.5',
      'flask': '2.3.3',
      'requests': '2.31.0',
      'numpy': '1.24.3',
      'pandas': '2.0.3'
    };

    const mockVulnerabilities: Record<string, { vulnerability: string; severity: any }> = {
      'django': {
        vulnerability: 'SQL Injection (CVE-2023-36053)',
        severity: 'high'
      },
      'requests': {
        vulnerability: 'Certificate Verification Bypass',
        severity: 'medium'
      }
    };

    const latestVersion = mockLatestVersions[name];
    if (latestVersion && currentVersion !== latestVersion) {
      outdated.push({
        name,
        current: currentVersion,
        latest: latestVersion,
        severity: 'medium'
      });
    }

    const vuln = mockVulnerabilities[name];
    if (vuln) {
      vulnerable.push({
        name,
        version: currentVersion,
        vulnerability: vuln.vulnerability,
        severity: vuln.severity
      });
    }
  }

  return { total, outdated, vulnerable };
}