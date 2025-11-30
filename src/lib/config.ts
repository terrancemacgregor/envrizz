import * as fs from 'fs';
import * as path from 'path';

export interface EnvSyncConfig {
  projectName?: string;
  awsRegion?: string;
  awsProfile?: string;
  awsAccountId?: string;
  exclude?: string[];
  include?: string[];
}

export class ConfigManager {
  private configPath: string;
  private config: EnvSyncConfig;

  constructor(projectRoot: string = process.cwd()) {
    this.configPath = path.join(projectRoot, '.envrizz.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): EnvSyncConfig {
    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }

    return this.getDefaultConfig();
  }

  private getDefaultConfig(): EnvSyncConfig {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    let projectName = path.basename(process.cwd());

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        projectName = packageJson.name || projectName;
      } catch (error) {
        console.error('Error reading package.json:', error);
      }
    }

    return {
      projectName,
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      awsProfile: process.env.AWS_PROFILE,
      awsAccountId: process.env.AWS_ACCOUNT_ID,
      exclude: ['.env.example', '.env.sample'],
      include: ['.env', '.env.*']
    };
  }

  saveConfig(config: EnvSyncConfig): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    this.config = config;
  }

  getConfig(): EnvSyncConfig {
    return this.config;
  }

  getProjectName(): string {
    return this.config.projectName || path.basename(process.cwd());
  }

  updateProjectName(name: string): void {
    this.config.projectName = name;
    this.saveConfig(this.config);
  }
}