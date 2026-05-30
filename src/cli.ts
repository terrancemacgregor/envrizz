#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { EnvParser } from './lib/env-parser';
import { AWSSecretsManager } from './lib/aws-secrets';
import { ConfigManager } from './lib/config';

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name('envrizz')
  .description('Give your .env files that rizz! Sync them with AWS Secrets Manager')
  .version(pkg.version);

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

      const parser = new EnvParser(process.cwd(), config.exclude);
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
      console.log('\u2714 Successfully synced to AWS Secrets Manager');
      const secretUrl = `https://${region}.console.aws.amazon.com/secretsmanager/secret?name=${encodeURIComponent(projectName)}&region=${region}`;
      console.log(`\u2192 View in AWS: ${secretUrl}`);

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

      console.log('\u2714 Successfully pulled from AWS Secrets Manager');

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
    const defaults = configManager.getDefaultConfig();

    // Merge defaults so exclude/include are always present
    const merged = { ...defaults, ...config };

    if (options.project) {
      merged.projectName = options.project;
    }

    configManager.saveConfig(merged);
    console.log('Created envrizz.json configuration file');
    console.log(`Project name: ${merged.projectName}`);

    // Add push/pull scripts to the project's package.json
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const scripts = pkgJson.scripts || {};
        let added = false;

        if (!scripts['env:push']) {
          scripts['env:push'] = 'envrizz push';
          added = true;
        }
        if (!scripts['env:pull']) {
          scripts['env:pull'] = 'envrizz pull';
          added = true;
        }

        if (added) {
          pkgJson.scripts = scripts;
          fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n');
          console.log('Added npm scripts: npm run env:push / npm run env:pull');
        }
      } catch {
        // Non-critical — skip silently if package.json can't be updated
      }
    }

    // Install git pre-commit hook to regenerate .env.example
    const gitHooksDir = path.join(process.cwd(), '.git', 'hooks');
    if (fs.existsSync(gitHooksDir)) {
      const preCommitPath = path.join(gitHooksDir, 'pre-commit');
      const envRizzHook = 'npx envrizz generate-example && git add .env.example';
      let hookContent = '';

      if (fs.existsSync(preCommitPath)) {
        const existing = fs.readFileSync(preCommitPath, 'utf-8');
        if (!existing.includes('envrizz generate-example')) {
          hookContent = existing.trimEnd() + '\n\n# envrizz: keep .env.example in sync\n' + envRizzHook + '\n';
        }
      } else {
        hookContent = '#!/bin/sh\n\n# envrizz: keep .env.example in sync\n' + envRizzHook + '\n';
      }

      if (hookContent) {
        fs.writeFileSync(preCommitPath, hookContent);
        fs.chmodSync(preCommitPath, '755');
        console.log('\u2714 Installed pre-commit hook to auto-generate .env.example');
      }
    }
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
    
    console.log('\u2714 Git pre-push hook installed');
    console.log('Your .env files will now sync automatically before each push');
  });

program
  .command('list')
  .description('List all environment variables that would be synced')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();
      const parser = new EnvParser(process.cwd(), config.exclude);
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

program
  .command('generate-example')
  .description('Generate .env.example from keys common to all .env files')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();
      const parser = new EnvParser(process.cwd(), config.exclude);
      const envFiles = await parser.findEnvFiles();

      if (envFiles.length === 0) {
        console.log('No .env files found');
        return;
      }

      // Collect keys from each file
      const fileSets: Set<string>[] = [];
      for (const file of envFiles) {
        const parsed = parser.parseEnvFile(file);
        fileSets.push(new Set(Object.keys(parsed)));
      }

      // Find keys that appear in ALL files
      const commonKeys = [...fileSets[0]].filter(key =>
        fileSets.every(s => s.has(key))
      );

      if (commonKeys.length === 0) {
        console.log('No common keys found across all .env files');
        return;
      }

      // Get comments from config, add TODOs for any missing keys
      const comments = config.comments || {};
      let configUpdated = false;
      const newKeys: string[] = [];

      for (const key of commonKeys) {
        if (!comments[key]) {
          comments[key] = `TODO: add description for ${key}`;
          configUpdated = true;
          newKeys.push(key);
        }
      }

      // Save updated comments back to config if new keys were found
      if (configUpdated) {
        config.comments = comments;
        configManager.saveConfig(config);
        console.log(`Added ${newKeys.length} new key(s) to envrizz.json comments:`);
        newKeys.forEach(key => console.log(`  ${key} \u2192 update description in envrizz.json`));
      }

      // Generate .env.example
      const now = new Date();
      const timestamp = now.toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      });

      const lines = [
        `# Generated by envrizz on ${timestamp}`,
        `# Keys common to: ${envFiles.join(', ')}`,
        `# Copy this file to .env and fill in the values`,
        '',
      ];

      for (const key of commonKeys) {
        lines.push(`# ${comments[key]}`);
        lines.push(`${key}=`);
        lines.push('');
      }

      const examplePath = path.join(process.cwd(), '.env.example');
      fs.writeFileSync(examplePath, lines.join('\n'));

      console.log(`\u2714 Generated .env.example with ${commonKeys.length} keys`);
      commonKeys.forEach(key => console.log(`  ${key}`));

    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('diff')
  .description('Compare keys across all .env files and show what\'s missing')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      const config = configManager.getConfig();
      const parser = new EnvParser(process.cwd(), config.exclude);
      const envFiles = await parser.findEnvFiles();

      if (envFiles.length === 0) {
        console.log('No .env files found');
        return;
      }

      if (envFiles.length === 1) {
        const parsed = parser.parseEnvFile(envFiles[0]);
        console.log(`Only one .env file found (${envFiles[0]}) with ${Object.keys(parsed).length} keys. Nothing to compare.`);
        return;
      }

      // Collect keys per file
      const fileKeys: Record<string, Set<string>> = {};
      for (const file of envFiles) {
        const parsed = parser.parseEnvFile(file);
        fileKeys[file] = new Set(Object.keys(parsed));
      }

      // All unique keys across every file
      const allKeys = new Set<string>();
      for (const keys of Object.values(fileKeys)) {
        for (const key of keys) allKeys.add(key);
      }

      // Common keys (in every file)
      const commonKeys = [...allKeys].filter(key =>
        Object.values(fileKeys).every(s => s.has(key))
      );

      // Print common keys
      console.log(`\nCommon to all files (${commonKeys.length}):`);
      if (commonKeys.length > 0) {
        console.log(`  ${commonKeys.join(', ')}`);
      } else {
        console.log('  (none)');
      }

      // Print what's missing from each file
      let allSynced = true;
      for (const file of envFiles) {
        const missing = [...allKeys].filter(key => !fileKeys[file].has(key));
        if (missing.length > 0) {
          allSynced = false;
          console.log(`\nMissing from ${file} (${missing.length}):`);
          missing.forEach(key => console.log(`  ${key}`));
        }
      }

      // Print keys unique to each file
      for (const file of envFiles) {
        const onlyHere = [...fileKeys[file]].filter(key =>
          Object.entries(fileKeys).every(([f, s]) => f === file || !s.has(key))
        );
        if (onlyHere.length > 0) {
          console.log(`\nOnly in ${file} (${onlyHere.length}):`);
          onlyHere.forEach(key => console.log(`  ${key}`));
        }
      }

      if (allSynced) {
        console.log('\n\u2714 All .env files have the same keys');
      }

      console.log('');

    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);