import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
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

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async findEnvFiles(): Promise<string[]> {
    const patterns = ['.env', '.env.*'];
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.projectRoot,
        absolute: false,
        dot: true,
        ignore: ['node_modules/**', '.git/**']
      });
      files.push(...matches);
    }

    return files.filter(file => !file.endsWith('.example'));
  }

  parseEnvFile(filePath: string): EnvData {
    const absolutePath = path.join(this.projectRoot, filePath);
    
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