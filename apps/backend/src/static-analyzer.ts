import fs from 'fs-extra';
import path from 'path';

export interface StaticAnalysisResult {
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
}

/**
 * Run static analysis on the repository based on detected language
 */
export async function runStaticAnalysis(repoPath: string, language: string): Promise<StaticAnalysisResult> {
  switch (language) {
    case 'javascript':
      return analyzeJavaScript(repoPath);
    case 'python':
      return analyzePython(repoPath);
    default:
      return {
        errors: [],
        summary: { totalFiles: 0, totalErrors: 0, totalWarnings: 0 }
      };
  }
}

/**
 * Analyze JavaScript files for common issues
 * In a real implementation, this would use ESLint or similar tools
 */
async function analyzeJavaScript(repoPath: string): Promise<StaticAnalysisResult> {
  const jsFiles = await findFiles(repoPath, ['.js', '.jsx', '.ts', '.tsx']);
  const errors: StaticAnalysisResult['errors'] = [];

  for (const filePath of jsFiles) {
    const relativePath = path.relative(repoPath, filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Check for common security and code quality issues
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // SQL Injection patterns
      if (trimmedLine.includes('query') && trimmedLine.includes('+') && trimmedLine.includes('SELECT')) {
        errors.push({
          file: relativePath,
          line: lineNumber,
          message: 'Potential SQL injection vulnerability',
          severity: 'error',
          rule: 'security/detect-sql-injection'
        });
      }

      // Hardcoded credentials
      if (trimmedLine.includes('password') && (trimmedLine.includes('=') || trimmedLine.includes(':'))) {
        if (trimmedLine.includes('"') || trimmedLine.includes("'")) {
          errors.push({
            file: relativePath,
            line: lineNumber,
            message: 'Hardcoded credentials detected',
            severity: 'error',
            rule: 'security/detect-hardcoded-credentials'
          });
        }
      }

      // Dangerous eval usage
      if (trimmedLine.includes('eval(')) {
        errors.push({
          file: relativePath,
          line: lineNumber,
          message: 'Use of eval() is dangerous and should be avoided',
          severity: 'error',
          rule: 'security/detect-eval-with-expression'
        });
      }

      // Synchronous operations in async context
      if (trimmedLine.includes('Sync(') && !trimmedLine.includes('//')) {
        errors.push({
          file: relativePath,
          line: lineNumber,
          message: 'Synchronous function in async context may block event loop',
          severity: 'warning',
          rule: 'performance/no-sync-in-async'
        });
      }

      // Console.log in production code
      if (trimmedLine.includes('console.log(') && !trimmedLine.includes('//')) {
        errors.push({
          file: relativePath,
          line: lineNumber,
          message: 'Console.log should be removed in production code',
          severity: 'warning',
          rule: 'no-console'
        });
      }

      // Missing error handling
      if (trimmedLine.includes('JSON.parse(') && !content.includes('try') && !content.includes('catch')) {
        errors.push({
          file: relativePath,
          line: lineNumber,
          message: 'JSON.parse should be wrapped in try-catch',
          severity: 'warning',
          rule: 'error-handling/json-parse'
        });
      }

      // Unused variables (simple check)
      const varMatch = trimmedLine.match(/(?:var|let|const)\s+(\w+)/);
      if (varMatch && !content.includes(varMatch[1] + '.') && !content.includes(varMatch[1] + '(')) {
        errors.push({
          file: relativePath,
          line: lineNumber,
          message: `Variable '${varMatch[1]}' is declared but never used`,
          severity: 'warning',
          rule: 'no-unused-vars'
        });
      }
    });
  }

  const totalErrors = errors.filter(e => e.severity === 'error').length;
  const totalWarnings = errors.filter(e => e.severity === 'warning').length;

  return {
    errors,
    summary: {
      totalFiles: jsFiles.length,
      totalErrors,
      totalWarnings
    }
  };
}

/**
 * Analyze Python files for common issues
 * In a real implementation, this would use flake8, pylint, or similar tools
 */
async function analyzePython(repoPath: string): Promise<StaticAnalysisResult> {
  const pyFiles = await findFiles(repoPath, ['.py']);
  const errors: StaticAnalysisResult['errors'] = [];

  for (const filePath of pyFiles) {
    const relativePath = path.relative(repoPath, filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // SQL Injection patterns
      if (trimmedLine.includes('execute(') && trimmedLine.includes('%') && trimmedLine.includes('SELECT')) {
        errors.push({
          file: relativePath,
          line: lineNumber,
          message: 'Potential SQL injection vulnerability',
          severity: 'error',
          rule: 'security/sql-injection'
        });
      }

      // Use of eval or exec
      if (trimmedLine.includes('eval(') || trimmedLine.includes('exec(')) {
        errors.push({
          file: relativePath,
          line: lineNumber,
          message: 'Use of eval() or exec() is dangerous',
          severity: 'error',
          rule: 'security/eval-exec'
        });
      }

      // Hardcoded secrets
      if (trimmedLine.includes('password') || trimmedLine.includes('secret')) {
        if (trimmedLine.includes('=') && (trimmedLine.includes('"') || trimmedLine.includes("'"))) {
          errors.push({
            file: relativePath,
            line: lineNumber,
            message: 'Hardcoded secret detected',
            severity: 'error',
            rule: 'security/hardcoded-secret'
          });
        }
      }

      // Bare except clauses
      if (trimmedLine === 'except:') {
        errors.push({
          file: relativePath,
          line: lineNumber,
          message: 'Bare except clause should specify exception type',
          severity: 'warning',
          rule: 'bare-except'
        });
      }

      // Line too long (simple check)
      if (line.length > 100) {
        errors.push({
          file: relativePath,
          line: lineNumber,
          message: 'Line too long (>100 characters)',
          severity: 'warning',
          rule: 'line-too-long'
        });
      }

      // Missing docstring for functions
      if (trimmedLine.startsWith('def ') && !lines[index + 1]?.trim().startsWith('"""')) {
        errors.push({
          file: relativePath,
          line: lineNumber,
          message: 'Function missing docstring',
          severity: 'info',
          rule: 'missing-docstring'
        });
      }
    });
  }

  const totalErrors = errors.filter(e => e.severity === 'error').length;
  const totalWarnings = errors.filter(e => e.severity === 'warning').length;

  return {
    errors,
    summary: {
      totalFiles: pyFiles.length,
      totalErrors,
      totalWarnings
    }
  };
}

/**
 * Find all files with specified extensions in directory
 */
async function findFiles(dirPath: string, extensions: string[]): Promise<string[]> {
  const files: string[] = [];

  async function traverse(currentPath: string) {
    const items = await fs.readdir(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        // Skip common directories that shouldn't be analyzed
        if (!['node_modules', '.git', 'dist', 'build', '__pycache__'].includes(item)) {
          await traverse(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  await traverse(dirPath);
  return files;
}