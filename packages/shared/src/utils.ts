import crypto from 'crypto';

/**
 * Generate a random UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password using SHA-256
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize filename for safe file operations
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
}

/**
 * Get file extension from path
 */
export function getFileExtension(filePath: string): string {
  return filePath.split('.').pop()?.toLowerCase() || '';
}

/**
 * Determine programming language from file extension
 */
export function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    ps1: 'powershell',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
  };

  return languageMap[extension] || 'text';
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
}

/**
 * Extract code blocks from markdown text
 */
export function extractCodeBlocks(markdown: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  let match;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }

  return blocks;
}

/**
 * Parse git diff output
 */
export function parseDiff(diff: string): Array<{
  file: string;
  additions: number;
  deletions: number;
  chunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: Array<{ type: 'add' | 'remove' | 'context'; content: string }>;
  }>;
}> {
  const files: Array<{
    file: string;
    additions: number;
    deletions: number;
    chunks: Array<{
      oldStart: number;
      oldLines: number;
      newStart: number;
      newLines: number;
      lines: Array<{ type: 'add' | 'remove' | 'context'; content: string }>;
    }>;
  }> = [];

  const lines = diff.split('\n');
  let currentFile: string | null = null;
  let currentChunk: any = null;
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      if (currentFile) {
        files.push({
          file: currentFile,
          additions,
          deletions,
          chunks: currentChunk ? [currentChunk] : []
        });
      }
      currentFile = line.split(' ')[3]?.substring(2) || '';
      additions = 0;
      deletions = 0;
      currentChunk = null;
    } else if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
      if (match) {
        currentChunk = {
          oldStart: parseInt(match[1]),
          oldLines: parseInt(match[2] || '1'),
          newStart: parseInt(match[3]),
          newLines: parseInt(match[4] || '1'),
          lines: []
        };
      }
    } else if (currentChunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
      const type = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'context';
      currentChunk.lines.push({
        type,
        content: line.substring(1)
      });
      
      if (type === 'add') additions++;
      if (type === 'remove') deletions++;
    }
  }

  if (currentFile) {
    files.push({
      file: currentFile,
      additions,
      deletions,
      chunks: currentChunk ? [currentChunk] : []
    });
  }

  return files;
}