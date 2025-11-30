#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { EnvParser } from './lib/env-parser';
import { AWSSecretsManager } from './lib/aws-secrets';
import { ConfigManager } from './lib/config';

const program = new Command();

program
  .name('envrizz')
  .description('Give your .env files that rizz! Sync them with AWS Secrets Manager')
  .version('1.0.0');

program
  .command('push')
  .description('Upload all .env files to AWS Secrets Manager')
  .option('-p, --project <name>', 'Project name for the secret')
  .option('-r, --region <region>', 'AWS region')
  .option('--profile <profile>', 'AWS SSO profile')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();
      
      const projectName = options.project || config.projectName || path.basename(process.cwd());
      const region = options.region || config.awsRegion;
      const profile = options.profile || config.awsProfile;

      console.log(`Syncing project: ${projectName}`);
      console.log(`Using AWS profile: ${profile}`);
      console.log(`Region: ${region}`);

      const parser = new EnvParser();
      const variables = await parser.getAllEnvVariables();

      if (variables.length === 0) {
        console.log('No .env files found');
        return;
      }

      console.log(`Found ${variables.length} environment variables across files:`);
      const files = [...new Set(variables.map(v => v.file))];
      files.forEach(file => {
        const count = variables.filter(v => v.file === file).length;
        console.log(`  - ${file}: ${count} variables`);
      });

      const formatted = parser.formatForAWS(variables);
      
      const awsManager = new AWSSecretsManager({
        region,
        profile,
        accountId: config.awsAccountId
      });

      await awsManager.uploadSecret(projectName, formatted);
      console.log('✅ Successfully synced to AWS Secrets Manager');

    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('pull')
  .description('Download .env files from AWS Secrets Manager')
  .option('-p, --project <name>', 'Project name for the secret')
  .option('-r, --region <region>', 'AWS region')
  .option('--profile <profile>', 'AWS SSO profile')
  .option('-o, --overwrite', 'Overwrite existing .env files')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();
      
      const projectName = options.project || config.projectName || path.basename(process.cwd());
      const region = options.region || config.awsRegion;
      const profile = options.profile || config.awsProfile;

      console.log(`Pulling project: ${projectName}`);
      console.log(`Using AWS profile: ${profile}`);
      console.log(`Region: ${region}`);

      const awsManager = new AWSSecretsManager({
        region,
        profile,
        accountId: config.awsAccountId
      });

      const secretData = await awsManager.getSecret(projectName);
      
      const parser = new EnvParser();
      const fileMap = parser.parseFromAWS(secretData);

      console.log(`Found ${fileMap.size} .env file(s) in AWS:`);
      
      for (const [fileName, envData] of fileMap.entries()) {
        const filePath = path.join(process.cwd(), fileName);
        
        if (fs.existsSync(filePath) && !options.overwrite) {
          console.log(`  - ${fileName}: exists (skipping, use --overwrite to replace)`);
          continue;
        }

        const content = Object.entries(envData)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');

        fs.writeFileSync(filePath, content);
        console.log(`  - ${fileName}: ${options.overwrite ? 'overwritten' : 'created'} (${Object.keys(envData).length} variables)`);
      }

      console.log('✅ Successfully pulled from AWS Secrets Manager');

    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize env-sync configuration')
  .option('-p, --project <name>', 'Project name')
  .action((options) => {
    const configManager = new ConfigManager();
    const config = configManager.getConfig();

    if (options.project) {
      config.projectName = options.project;
    }

    configManager.saveConfig(config);
    console.log('Created .envrizz.json configuration file');
    console.log(`Project name: ${config.projectName}`);
  });

program
  .command('install-hook')
  .description('Install git pre-push hook')
  .action(() => {
    const gitHookPath = path.join(process.cwd(), '.git', 'hooks', 'pre-push');
    
    if (!fs.existsSync(path.dirname(gitHookPath))) {
      console.error('Not in a git repository');
      process.exit(1);
    }

    const hookContent = `#!/bin/sh
# envrizz pre-push hook
# Automatically sync .env files to AWS before push

echo "Syncing .env files to AWS..."
npx envrizz push

if [ $? -ne 0 ]; then
  echo "Failed to sync .env files. Push aborted."
  exit 1
fi

echo "Environment sync complete."
`;

    fs.writeFileSync(gitHookPath, hookContent);
    fs.chmodSync(gitHookPath, '755');
    
    console.log('✅ Git pre-push hook installed');
    console.log('Your .env files will now sync automatically before each push');
  });

program
  .command('list')
  .description('List all environment variables that would be synced')
  .action(async () => {
    try {
      const parser = new EnvParser();
      const variables = await parser.getAllEnvVariables();

      if (variables.length === 0) {
        console.log('No .env files found');
        return;
      }

      console.log('Environment variables to sync:\n');
      
      const fileGroups = variables.reduce((acc, v) => {
        if (!acc[v.file]) acc[v.file] = [];
        acc[v.file].push(v);
        return acc;
      }, {} as Record<string, typeof variables>);

      for (const [file, vars] of Object.entries(fileGroups)) {
        console.log(`${file}:`);
        vars.forEach(v => {
          const value = v.value.length > 50 
            ? v.value.substring(0, 47) + '...' 
            : v.value;
          console.log(`  ${v.key}=${value}`);
        });
        console.log('');
      }

    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);