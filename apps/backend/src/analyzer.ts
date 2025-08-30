import fs from 'fs-extra';
import path from 'path';
import { simpleGit } from 'simple-git';
import { analyzeDependencies } from './dependency-analyzer';
import { runStaticAnalysis } from './static-analyzer';
import { generateAISummary } from './ai-mock';

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

/**
 * Main function to analyze a repository
 * Clones repo, analyzes dependencies, runs static analysis, and generates AI summary
 */
export async function analyzeRepository(repoUrl: string): Promise<AnalysisResult> {
  const tempDir = path.join(__dirname, '../../temp');
  const repoName = extractRepoName(repoUrl);
  const repoPath = path.join(tempDir, repoName);

  try {
    // Ensure temp directory exists
    await fs.ensureDir(tempDir);

    // Check if it's a demo repository request
    if (repoUrl.includes('demo') || repoUrl === 'demo') {
      return analyzeDemoRepository();
    }

    // Clone repository
    console.log(`Cloning repository: ${repoUrl}`);
    await cloneRepository(repoUrl, repoPath);

    // Detect primary language
    const language = await detectLanguage(repoPath);
    console.log(`Detected language: ${language}`);

    // Analyze dependencies
    console.log('Analyzing dependencies...');
    const dependencies = await analyzeDependencies(repoPath, language);

    // Run static analysis
    console.log('Running static analysis...');
    const staticAnalysis = await runStaticAnalysis(repoPath, language);

    // Generate AI summary
    console.log('Generating AI summary...');
    const aiSummary = await generateAISummary(dependencies, staticAnalysis);

    // Clean up
    await fs.remove(repoPath);

    return {
      repository: {
        name: repoName,
        url: repoUrl,
        language
      },
      dependencies,
      staticAnalysis,
      aiSummary
    };

  } catch (error) {
    // Clean up on error
    if (await fs.pathExists(repoPath)) {
      await fs.remove(repoPath);
    }
    throw error;
  }
}

/**
 * Clone a Git repository to local directory
 */
async function cloneRepository(repoUrl: string, targetPath: string): Promise<void> {
  const git = simpleGit();
  
  // Remove existing directory if it exists
  if (await fs.pathExists(targetPath)) {
    await fs.remove(targetPath);
  }

  // Clone with depth 1 for faster cloning
  await git.clone(repoUrl, targetPath, ['--depth', '1']);
}

/**
 * Extract repository name from URL
 */
function extractRepoName(repoUrl: string): string {
  if (repoUrl.includes('demo')) return 'demo-repo';
  
  const match = repoUrl.match(/\/([^\/]+)\.git$/) || repoUrl.match(/\/([^\/]+)\/?$/);
  return match ? match[1] : 'unknown-repo';
}

/**
 * Detect the primary programming language of the repository
 */
async function detectLanguage(repoPath: string): Promise<string> {
  const files = await fs.readdir(repoPath);
  
  // Check for common language indicators
  if (files.includes('package.json')) return 'javascript';
  if (files.includes('requirements.txt') || files.includes('setup.py')) return 'python';
  if (files.includes('Cargo.toml')) return 'rust';
  if (files.includes('go.mod')) return 'go';
  if (files.includes('pom.xml') || files.includes('build.gradle')) return 'java';
  
  // Check file extensions
  const allFiles = await getAllFiles(repoPath);
  const extensions = allFiles.map(f => path.extname(f).toLowerCase());
  
  if (extensions.some(ext => ['.js', '.jsx', '.ts', '.tsx'].includes(ext))) return 'javascript';
  if (extensions.some(ext => ['.py'].includes(ext))) return 'python';
  if (extensions.some(ext => ['.java'].includes(ext))) return 'java';
  if (extensions.some(ext => ['.rs'].includes(ext))) return 'rust';
  if (extensions.some(ext => ['.go'].includes(ext))) return 'go';
  
  return 'unknown';
}

/**
 * Get all files in directory recursively
 */
async function getAllFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  
  async function traverse(currentPath: string) {
    const items = await fs.readdir(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        await traverse(fullPath);
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
  }
  
  await traverse(dirPath);
  return files;
}

/**
 * Analyze demo repository (hardcoded vulnerable example)
 */
function analyzeDemoRepository(): AnalysisResult {
  return {
    repository: {
      name: 'vulnerable-todo-app',
      url: 'demo',
      language: 'javascript'
    },
    dependencies: {
      total: 4,
      outdated: [
        {
          name: 'express',
          current: '4.16.0',
          latest: '4.18.2',
          severity: 'medium'
        },
        {
          name: 'lodash',
          current: '4.17.4',
          latest: '4.17.21',
          severity: 'high'
        }
      ],
      vulnerable: [
        {
          name: 'lodash',
          version: '4.17.4',
          vulnerability: 'Prototype Pollution (CVE-2019-10744)',
          severity: 'high'
        },
        {
          name: 'bcrypt',
          version: '3.0.0',
          vulnerability: 'Timing Attack Vulnerability',
          severity: 'medium'
        }
      ]
    },
    staticAnalysis: {
      errors: [
        {
          file: 'server.js',
          line: 15,
          message: 'Potential SQL injection vulnerability',
          severity: 'error',
          rule: 'security/detect-sql-injection'
        },
        {
          file: 'server.js',
          line: 8,
          message: 'Hardcoded database credentials',
          severity: 'error',
          rule: 'security/detect-hardcoded-credentials'
        },
        {
          file: 'utils.js',
          line: 14,
          message: 'Use of eval() is dangerous',
          severity: 'error',
          rule: 'security/detect-eval-with-expression'
        },
        {
          file: 'server.js',
          line: 35,
          message: 'Synchronous function in async context',
          severity: 'warning',
          rule: 'performance/no-sync-in-async'
        }
      ],
      summary: {
        totalFiles: 3,
        totalErrors: 3,
        totalWarnings: 1
      }
    },
    aiSummary: {
      riskLevel: 'high',
      summary: 'This repository contains several critical security vulnerabilities including SQL injection, hardcoded credentials, and dangerous use of eval(). The outdated dependencies also introduce additional security risks.',
      recommendations: [
        'Immediately fix SQL injection vulnerabilities by using parameterized queries',
        'Remove hardcoded database credentials and use environment variables',
        'Replace eval() usage with safer alternatives like JSON.parse()',
        'Update all dependencies to their latest secure versions',
        'Implement input validation and sanitization',
        'Add security headers and CORS protection'
      ],
      priorityFixes: [
        'Fix SQL injection in server.js line 15',
        'Remove hardcoded credentials in server.js line 8',
        'Update lodash to fix prototype pollution vulnerability'
      ]
    }
  };
}