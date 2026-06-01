import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

export interface EnvVariable {
  file: string;
  key: string;
  value: string;
}

export interface EnvData {
  [key: string]: string;
}

export class EnvParser {
  private projectRoot: string;
  private exclude: string[];

  constructor(projectRoot: string = process.cwd(), exclude: string[] = ['.env.example', '.env.sample']) {
    this.projectRoot = projectRoot;
    this.exclude = exclude;
  }

  async findEnvFiles(): Promise<string[]> {
    const entries = await fs.promises.readdir(this.projectRoot);
    const files = entries.filter(
      (file) =>
        (file === '.env' || file.startsWith('.env.')) &&
        !this.exclude.includes(file)
    );
    return files;
  }

  parseEnvFile(filePath: string): EnvData {
    const absolutePath = path.resolve(this.projectRoot, filePath);

    // Prevent path traversal
    if (!absolutePath.startsWith(this.projectRoot + path.sep) && absolutePath !== this.projectRoot) {
      throw new Error(`Path traversal detected: ${filePath}`);
    }

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const parsed = dotenv.parse(content);
    
    return parsed;
  }

  async getAllEnvVariables(): Promise<EnvVariable[]> {
    const envFiles = await this.findEnvFiles();
    const variables: EnvVariable[] = [];

    for (const file of envFiles) {
      try {
        const parsed = this.parseEnvFile(file);
        
        for (const [key, value] of Object.entries(parsed)) {
          variables.push({
            file,
            key,
            value
          });
        }
      } catch (error) {
        console.error(`Error parsing ${file}:`, error);
      }
    }

    return variables;
  }

  formatForAWS(variables: EnvVariable[]): Record<string, string> {
    const formatted: Record<string, string> = {};

    for (const variable of variables) {
      const awsKey = `${variable.file}.${variable.key}`;
      formatted[awsKey] = variable.value;
    }

    return formatted;
  }

  parseFromAWS(awsData: Record<string, string>): Map<string, EnvData> {
    const fileMap = new Map<string, EnvData>();

    for (const [awsKey, value] of Object.entries(awsData)) {
      const lastDotIndex = awsKey.lastIndexOf('.');
      if (lastDotIndex === -1) continue;

      const file = awsKey.substring(0, lastDotIndex);
      const key = awsKey.substring(lastDotIndex + 1);

      if (!fileMap.has(file)) {
        fileMap.set(file, {});
      }

      fileMap.get(file)![key] = value;
    }

    return fileMap;
  }
}