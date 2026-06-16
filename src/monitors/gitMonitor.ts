import { execSync } from 'child_process';
import tcGenerateLogger from '../utils/tc-generate-logger.js';

interface MappingConfig {
  filePatterns: string[];
}

class GitMonitor {
  private readonly repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  getChangedFiles(baseBranch = 'main', compareBranch = 'HEAD'): string[] {
    try {
      tcGenerateLogger.info(`Getting changed files between ${baseBranch} and ${compareBranch}`);

      const output = execSync(
        `git diff --name-only ${baseBranch}...${compareBranch}`,
        {
          cwd: this.repoPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      const files = output.trim().split('\n').filter(Boolean);
      tcGenerateLogger.info(`Found ${files.length} changed files`);
      return files;
    } catch (error) {
      tcGenerateLogger.error('Error getting changed files from git', error);
      return [];
    }
  }

  getChangedFilesSinceCommit(commitHash: string): string[] {
    try {
      const output = execSync(
        `git diff --name-only ${commitHash}..HEAD`,
        { cwd: this.repoPath, encoding: 'utf-8' },
      );
      return output.trim().split('\n').filter(Boolean);
    } catch (error) {
      tcGenerateLogger.error(`Error getting changed files since ${commitHash}`, error);
      return [];
    }
  }

  getCurrentBranch(): string | null {
    try {
      const branch = execSync(
        'git branch --show-current',
        { cwd: this.repoPath, encoding: 'utf-8' },
      );
      return branch.trim();
    } catch (error) {
      tcGenerateLogger.error('Error getting current branch', error);
      return null;
    }
  }

  mapFilesToTestAreas(changedFiles: string[], mappingConfig: Record<string, MappingConfig>): string[] {
    const affectedAreas = new Set<string>();

    tcGenerateLogger.info('Mapping changed files to test areas...');

    for (const file of changedFiles) {
      for (const [area, config] of Object.entries(mappingConfig)) {
        if (config.filePatterns.some(pattern => this.matchesPattern(file, pattern))) {
          affectedAreas.add(area);
          tcGenerateLogger.debug(`File ${file} matches area: ${area}`);
        }
      }
    }

    const areas = Array.from(affectedAreas);
    tcGenerateLogger.info(`Affected areas: ${areas.join(', ')}`);
    return areas;
  }

  matchesPattern(file: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '§§')
      .replace(/\*/g, '[^/]*')
      .replace(/§§/g, '.*')
      .replace(/\./g, '\\.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(file);
  }

  getFileChanges(file: string): string {
    try {
      const output = execSync(
        `git diff HEAD -- "${file}"`,
        { cwd: this.repoPath, encoding: 'utf-8' },
      );
      return output;
    } catch (error) {
      tcGenerateLogger.error(`Error getting changes for file ${file}`, error);
      return '';
    }
  }

  getCommitMessage(commitHash = 'HEAD'): string {
    try {
      const message = execSync(
        `git log -1 --pretty=%B ${commitHash}`,
        { cwd: this.repoPath, encoding: 'utf-8' },
      );
      return message.trim();
    } catch (error) {
      tcGenerateLogger.error(`Error getting commit message for ${commitHash}`, error);
      return '';
    }
  }
}

export default GitMonitor;
