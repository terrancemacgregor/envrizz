import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from './config';

describe('ConfigManager', () => {
  let tmpDir: string;
  const origCwd = process.cwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envrizz-config-test-'));
    // Mock cwd so getDefaultConfig reads from tmpDir
    process.cwd = () => tmpDir;
  });

  afterEach(() => {
    process.cwd = origCwd;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── Default Config ───────────────────────────────────────────────────

  describe('getDefaultConfig', () => {
    it('returns sensible defaults when no config file exists', () => {
      const cm = new ConfigManager(tmpDir);
      const config = cm.getDefaultConfig();
      expect(config.awsRegion).toBe('us-east-1');
      expect(config.exclude).toEqual(['.env.example', '.env.sample']);
      expect(config.include).toEqual(['.env', '.env.*']);
    });

    it('reads project name from package.json if present', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'my-cool-app' }));
      const cm = new ConfigManager(tmpDir);
      const config = cm.getDefaultConfig();
      expect(config.projectName).toBe('my-cool-app');
    });

    it('falls back to directory name when no package.json', () => {
      const cm = new ConfigManager(tmpDir);
      const config = cm.getDefaultConfig();
      expect(config.projectName).toBe(path.basename(tmpDir));
    });
  });

  // ── Save and Load ───────────────────────────────────────────────────

  describe('saveConfig / getConfig', () => {
    it('saves and loads config as JSON', () => {
      const cm = new ConfigManager(tmpDir);
      cm.saveConfig({
        projectName: 'test-project',
        awsRegion: 'eu-west-1',
        awsProfile: 'dev',
      });

      const cm2 = new ConfigManager(tmpDir);
      const loaded = cm2.getConfig();
      expect(loaded.projectName).toBe('test-project');
      expect(loaded.awsRegion).toBe('eu-west-1');
      expect(loaded.awsProfile).toBe('dev');
    });

    it('creates envrizz.json file on disk', () => {
      const cm = new ConfigManager(tmpDir);
      cm.saveConfig({ projectName: 'test' });
      expect(fs.existsSync(path.join(tmpDir, 'envrizz.json'))).toBe(true);
    });

    it('preserves all fields through save/load cycle', () => {
      const full = {
        projectName: 'roundtrip',
        awsRegion: 'ap-southeast-1',
        awsProfile: 'staging',
        awsAccountId: '123456789',
        exclude: ['.env.test'],
        include: ['.env'],
      };
      const cm = new ConfigManager(tmpDir);
      cm.saveConfig(full);

      const cm2 = new ConfigManager(tmpDir);
      expect(cm2.getConfig()).toEqual(full);
    });
  });

  // ── Migration ───────────────────────────────────────────────────────

  describe('migration from .envrizz.json', () => {
    it('migrates .envrizz.json to envrizz.json', () => {
      const oldConfig = { projectName: 'legacy', awsRegion: 'us-west-2' };
      fs.writeFileSync(path.join(tmpDir, '.envrizz.json'), JSON.stringify(oldConfig));

      const cm = new ConfigManager(tmpDir);
      const config = cm.getConfig();

      expect(config.projectName).toBe('legacy');
      expect(config.awsRegion).toBe('us-west-2');
      expect(fs.existsSync(path.join(tmpDir, 'envrizz.json'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.envrizz.json'))).toBe(false);
    });

    it('prefers envrizz.json when both files exist', () => {
      fs.writeFileSync(path.join(tmpDir, '.envrizz.json'), JSON.stringify({ projectName: 'old' }));
      fs.writeFileSync(path.join(tmpDir, 'envrizz.json'), JSON.stringify({ projectName: 'new' }));

      const cm = new ConfigManager(tmpDir);
      expect(cm.getConfig().projectName).toBe('new');
    });
  });

  // ── getProjectName / updateProjectName ─────────────────────────────

  describe('getProjectName', () => {
    it('returns project name from config', () => {
      const cm = new ConfigManager(tmpDir);
      cm.saveConfig({ projectName: 'named-project' });

      const cm2 = new ConfigManager(tmpDir);
      expect(cm2.getProjectName()).toBe('named-project');
    });

    it('falls back to cwd basename when not set', () => {
      const cm = new ConfigManager(tmpDir);
      // No config saved, no projectName in default without package.json
      expect(cm.getProjectName()).toBe(path.basename(tmpDir));
    });
  });

  describe('updateProjectName', () => {
    it('updates and persists the project name', () => {
      const cm = new ConfigManager(tmpDir);
      cm.saveConfig({ projectName: 'original' });
      cm.updateProjectName('renamed');

      const cm2 = new ConfigManager(tmpDir);
      expect(cm2.getProjectName()).toBe('renamed');
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles corrupted config file gracefully', () => {
      fs.writeFileSync(path.join(tmpDir, 'envrizz.json'), 'not valid json{{{');
      const cm = new ConfigManager(tmpDir);
      const config = cm.getConfig();
      // Should fall back to defaults
      expect(config.exclude).toEqual(['.env.example', '.env.sample']);
    });

    it('handles empty config file', () => {
      fs.writeFileSync(path.join(tmpDir, 'envrizz.json'), '{}');
      const cm = new ConfigManager(tmpDir);
      const config = cm.getConfig();
      expect(config).toEqual({});
    });
  });
});
