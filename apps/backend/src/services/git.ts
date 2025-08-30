import simpleGit, { SimpleGit, CleanOptions } from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import { generateId } from '@repo-guardian/shared';

/**
 * Git service for repository operations
 */
export class GitService {
  private git: SimpleGit;
  private workingDir: string;

  constructor(workingDir?: string) {
    this.workingDir = workingDir || path.join(process.cwd(), 'temp', 'repos');
    this.git = simpleGit({
      baseDir: this.workingDir,
      binary: 'git',
      maxConcurrentProcesses: 6,
    });
  }

  /**
   * Clone a repository
   */
  async cloneRepository(url: string, name?: string): Promise<string> {
    try {
      const repoName = name || generateId();
      const repoPath = path.join(this.workingDir, repoName);

      // Ensure working directory exists
      await fs.mkdir(this.workingDir, { recursive: true });

      // Clone repository
      await this.git.clone(url, repoPath, ['--depth', '1']);

      return repoPath;
    } catch (error) {
      console.error('Git clone error:', error);
      throw new Error(`Failed to clone repository: ${error}`);
    }
  }

  /**
   * Read repository files
   */
  async readRepositoryFiles(repoPath: string): Promise<Array<{
    path: string;
    content: string;
    language: string;
    size: number;
  }>> {
    try {
      const files: Array<{
        path: string;
        content: string;
        language: string;
        size: number;
      }> = [];

      await this.walkDirectory(repoPath, repoPath, files);
      return files;
    } catch (error) {
      console.error('Error reading repository files:', error);
      throw new Error(`Failed to read repository files: ${error}`);
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(repoPath: string, branchName: string): Promise<void> {
    try {
      const git = simpleGit(repoPath);
      await git.checkoutLocalBranch(branchName);
    } catch (error) {
      console.error('Error creating branch:', error);
      throw new Error(`Failed to create branch: ${error}`);
    }
  }

  /**
   * Commit changes
   */
  async commitChanges(
    repoPath: string,
    message: string,
    files?: string[]
  ): Promise<string> {
    try {
      const git = simpleGit(repoPath);

      if (files && files.length > 0) {
        await git.add(files);
      } else {
        await git.add('.');
      }

      const commit = await git.commit(message);
      return commit.commit;
    } catch (error) {
      console.error('Error committing changes:', error);
      throw new Error(`Failed to commit changes: ${error}`);
    }
  }

  /**
   * Push changes to remote
   */
  async pushChanges(repoPath: string, branch: string = 'main'): Promise<void> {
    try {
      const git = simpleGit(repoPath);
      await git.push('origin', branch);
    } catch (error) {
      console.error('Error pushing changes:', error);
      throw new Error(`Failed to push changes: ${error}`);
    }
  }

  /**
   * Apply code fixes to files
   */
  async applyFixes(
    repoPath: string,
    fixes: Array<{
      filePath: string;
      originalCode: string;
      fixedCode: string;
    }>
  ): Promise<void> {
    try {
      for (const fix of fixes) {
        const fullPath = path.join(repoPath, fix.filePath);
        
        // Read current file content
        const currentContent = await fs.readFile(fullPath, 'utf-8');
        
        // Replace the original code with fixed code
        const updatedContent = currentContent.replace(
          fix.originalCode,
          fix.fixedCode
        );
        
        // Write updated content back to file
        await fs.writeFile(fullPath, updatedContent, 'utf-8');
      }
    } catch (error) {
      console.error('Error applying fixes:', error);
      throw new Error(`Failed to apply fixes: ${error}`);
    }
  }

  /**
   * Get repository status
   */
  async getStatus(repoPath: string): Promise<{
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
  }> {
    try {
      const git = simpleGit(repoPath);
      const status = await git.status();

      return {
        modified: status.modified,
        added: status.created,
        deleted: status.deleted,
        untracked: status.not_added,
      };
    } catch (error) {
      console.error('Error getting git status:', error);
      throw new Error(`Failed to get repository status: ${error}`);
    }
  }

  /**
   * Get commit history
   */
  async getCommitHistory(repoPath: string, limit: number = 10): Promise<Array<{
    hash: string;
    message: string;
    author: string;
    date: Date;
  }>> {
    try {
      const git = simpleGit(repoPath);
      const log = await git.log({ maxCount: limit });

      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: new Date(commit.date),
      }));
    } catch (error) {
      console.error('Error getting commit history:', error);
      throw new Error(`Failed to get commit history: ${error}`);
    }
  }

  /**
   * Get diff between commits or branches
   */
  async getDiff(
    repoPath: string,
    from?: string,
    to?: string
  ): Promise<string> {
    try {
      const git = simpleGit(repoPath);
      
      if (from && to) {
        return await git.diff([`${from}..${to}`]);
      } else if (from) {
        return await git.diff([from]);
      } else {
        return await git.diff();
      }
    } catch (error) {
      console.error('Error getting diff:', error);
      throw new Error(`Failed to get diff: ${error}`);
    }
  }

  /**
   * Clean up repository directory
   */
  async cleanup(repoPath: string): Promise<void> {
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up repository:', error);
      // Don't throw error for cleanup failures
    }
  }

  /**
   * Recursively walk directory and collect files
   */
  private async walkDirectory(
    dirPath: string,
    basePath: string,
    files: Array<{
      path: string;
      content: string;
      language: string;
      size: number;
    }>
  ): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      // Skip hidden files and directories, node_modules, etc.
      if (this.shouldSkipPath(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walkDirectory(fullPath, basePath, files);
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(fullPath);
          
          // Skip large files (> 1MB)
          if (stats.size > 1024 * 1024) {
            continue;
          }

          // Only process text files
          if (!this.isTextFile(relativePath)) {
            continue;
          }

          const content = await fs.readFile(fullPath, 'utf-8');
          const language = this.getLanguageFromPath(relativePath);

          files.push({
            path: relativePath.replace(/\\/g, '/'), // Normalize path separators
            content,
            language,
            size: stats.size,
          });
        } catch (error) {
          // Skip files that can't be read
          console.warn(`Skipping file ${relativePath}: ${error}`);
        }
      }
    }
  }

  /**
   * Check if path should be skipped
   */
  private shouldSkipPath(relativePath: string): boolean {
    const skipPatterns = [
      /^\.git/,
      /^node_modules/,
      /^\.next/,
      /^dist/,
      /^build/,
      /^coverage/,
      /^\.nyc_output/,
      /^\.cache/,
      /^\.vscode/,
      /^\.idea/,
      /^\./,
      /vendor/,
      /target/,
      /bin/,
      /obj/,
    ];

    return skipPatterns.some(pattern => pattern.test(relativePath));
  }

  /**
   * Check if file is a text file
   */
  private isTextFile(filePath: string): boolean {
    const textExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
      '.py', '.rb', '.php', '.java', '.c', '.cpp', '.cs', '.go', '.rs',
      '.html', '.css', '.scss', '.sass', '.less',
      '.json', '.xml', '.yaml', '.yml', '.toml',
      '.md', '.txt', '.rst',
      '.sql', '.graphql', '.gql',
      '.sh', '.bash', '.zsh', '.fish', '.ps1',
      '.dockerfile', '.dockerignore',
      '.gitignore', '.gitattributes',
      '.env', '.env.example',
      'Makefile', 'Dockerfile', 'README', 'LICENSE',
    ];

    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);

    return textExtensions.includes(ext) || 
           textExtensions.includes(basename) ||
           basename.startsWith('.');
  }

  /**
   * Get programming language from file path
   */
  private getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();

    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.vue': 'vue',
      '.svelte': 'svelte',
      '.py': 'python',
      '.rb': 'ruby',
      '.php': 'php',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.md': 'markdown',
      '.txt': 'text',
      '.rst': 'restructuredtext',
      '.sql': 'sql',
      '.graphql': 'graphql',
      '.gql': 'graphql',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'bash',
      '.fish': 'bash',
      '.ps1': 'powershell',
    };

    // Check by extension first
    if (languageMap[ext]) {
      return languageMap[ext];
    }

    // Check by filename
    if (basename === 'dockerfile') return 'dockerfile';
    if (basename === 'makefile') return 'makefile';
    if (basename.startsWith('readme')) return 'markdown';
    if (basename === 'license') return 'text';

    return 'text';
  }
}

export default GitService;