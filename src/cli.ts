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

program
  .command('doctor')
  .description('Run a health check on your envrizz setup')
  .action(async () => {
    const checks: { name: string; status: string; detail: string }[] = [];
    const recommendations: string[] = [];

    // 1. envrizz.json
    const configPath = path.join(process.cwd(), 'envrizz.json');
    let config: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        checks.push({ name: 'envrizz.json', status: 'pass', detail: 'Found and valid' });
      } catch {
        checks.push({ name: 'envrizz.json', status: 'fail', detail: 'Invalid JSON' });
        recommendations.push('Fix the JSON syntax in envrizz.json');
      }
    } else {
      checks.push({ name: 'envrizz.json', status: 'fail', detail: 'Not found' });
      recommendations.push('Run "npx envrizz init" to create the config');
    }

    // 2. Project name
    const projectName = config.projectName as string || '';
    if (projectName) {
      checks.push({ name: 'Project name', status: 'pass', detail: projectName });
    } else {
      checks.push({ name: 'Project name', status: 'warn', detail: 'Not set — will use directory name' });
      recommendations.push('Set projectName in envrizz.json');
    }

    // 3. .env files
    const configManager = new ConfigManager();
    const fullConfig = configManager.getConfig();
    const parser = new EnvParser(process.cwd(), fullConfig.exclude);
    const envFiles = await parser.findEnvFiles();
    if (envFiles.length > 0) {
      let totalVars = 0;
      const fileDetails: string[] = [];
      for (const ef of envFiles) {
        const parsed = parser.parseEnvFile(ef);
        const count = Object.keys(parsed).length;
        totalVars += count;
        fileDetails.push(`${ef} (${count})`);
      }
      checks.push({ name: '.env files', status: 'pass', detail: `${envFiles.length} files, ${totalVars} variables` });
    } else {
      checks.push({ name: '.env files', status: 'warn', detail: 'No .env files found' });
      recommendations.push('Create .env files or run "npx envrizz pull"');
    }

    // 4. .env.example
    const examplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(examplePath)) {
      checks.push({ name: '.env.example', status: 'pass', detail: 'Exists' });
    } else {
      checks.push({ name: '.env.example', status: 'fail', detail: 'Not found' });
      recommendations.push('Run "npx envrizz generate-example" to create it');
    }

    // 5. Comments
    const comments = (config.comments || {}) as Record<string, string>;
    const commentKeys = Object.keys(comments);
    const todos = commentKeys.filter(k => comments[k].startsWith('TODO:'));
    if (commentKeys.length > 0 && todos.length === 0) {
      checks.push({ name: 'Comments', status: 'pass', detail: `${commentKeys.length} keys documented` });
    } else if (todos.length > 0) {
      checks.push({ name: 'Comments', status: 'warn', detail: `${todos.length} TODOs remaining` });
      recommendations.push(`Update descriptions for ${todos.join(', ')} in envrizz.json`);
    } else {
      checks.push({ name: 'Comments', status: 'warn', detail: 'No comments section' });
      recommendations.push('Run "npx envrizz generate-example" to populate comments');
    }

    // 6. .gitignore
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      const hasEnv = gitignore.includes('.env');
      const hasException = gitignore.includes('!.env.example');
      if (hasEnv && hasException) {
        checks.push({ name: '.gitignore', status: 'pass', detail: '.env ignored, .env.example allowed' });
      } else if (hasEnv) {
        checks.push({ name: '.gitignore', status: 'warn', detail: '.env.example not explicitly allowed' });
        recommendations.push('Add "!.env.example" to .gitignore');
      } else {
        checks.push({ name: '.gitignore', status: 'fail', detail: '.env files are NOT ignored' });
        recommendations.push('Add .env and .env.* to .gitignore immediately');
      }
    } else {
      checks.push({ name: '.gitignore', status: 'fail', detail: 'No .gitignore found' });
      recommendations.push('Create a .gitignore and add .env patterns');
    }

    // 7. Git hooks
    const hookPath = path.join(process.cwd(), '.git', 'hooks', 'pre-commit');
    if (fs.existsSync(hookPath)) {
      const hook = fs.readFileSync(hookPath, 'utf-8');
      if (hook.includes('envrizz generate-example')) {
        checks.push({ name: 'Git hooks', status: 'pass', detail: 'pre-commit installed' });
      } else {
        checks.push({ name: 'Git hooks', status: 'warn', detail: 'pre-commit exists but missing envrizz' });
        recommendations.push('Run "npx envrizz init" to add generate-example to pre-commit hook');
      }
    } else {
      checks.push({ name: 'Git hooks', status: 'fail', detail: 'pre-commit not installed' });
      recommendations.push('Run "npx envrizz init" to install the pre-commit hook');
    }

    // 8. npm scripts
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const scripts = pkg.scripts || {};
      const hasPush = 'env:push' in scripts;
      const hasPull = 'env:pull' in scripts;
      if (hasPush && hasPull) {
        checks.push({ name: 'npm scripts', status: 'pass', detail: 'env:push and env:pull configured' });
      } else {
        const missing = !hasPush && !hasPull ? 'env:push and env:pull' : !hasPush ? 'env:push' : 'env:pull';
        checks.push({ name: 'npm scripts', status: 'fail', detail: `Missing ${missing}` });
        recommendations.push('Run "npx envrizz init" to add npm scripts');
      }
    }

    // 9. Environment drift
    if (envFiles.length >= 2) {
      const fileKeys: Record<string, Set<string>> = {};
      for (const ef of envFiles) {
        const parsed = parser.parseEnvFile(ef);
        fileKeys[ef] = new Set(Object.keys(parsed));
      }
      const allKeys = new Set<string>();
      for (const keys of Object.values(fileKeys)) {
        for (const k of keys) allKeys.add(k);
      }
      const driftKeys = [...allKeys].filter(k => !Object.values(fileKeys).every(s => s.has(k)));
      if (driftKeys.length > 0) {
        checks.push({ name: 'Environment drift', status: 'warn', detail: `${driftKeys.length} keys not in all files` });
        recommendations.push('Run "npx envrizz diff" to see the full breakdown');
      } else {
        checks.push({ name: 'Environment drift', status: 'pass', detail: `All ${envFiles.length} files have the same keys` });
      }
    }

    // Print results
    const passCount = checks.filter(c => c.status === 'pass').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;
    const failCount = checks.filter(c => c.status === 'fail').length;

    console.log('\nEnvironment Health Check');
    console.log('\u2500'.repeat(40));

    for (const check of checks) {
      const icon = check.status === 'pass' ? '\u2714' : check.status === 'warn' ? '\u26A0' : '\u2718';
      const padding = ' '.repeat(Math.max(0, 22 - check.name.length));
      console.log(`  ${check.name}${padding}${icon} ${check.detail}`);
    }

    console.log('');
    console.log(`  ${passCount} passed, ${warnCount} warnings, ${failCount} failures`);

    if (recommendations.length > 0) {
      console.log(`\n${recommendations.length} recommendation(s):`);
      for (const rec of recommendations) {
        console.log(`  \u2192 ${rec}`);
      }
    }

    console.log('');
  });

program.parse(process.argv);