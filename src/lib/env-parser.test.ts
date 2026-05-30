import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EnvParser } from './env-parser';

describe('EnvParser', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envrizz-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── findEnvFiles ─────────────────────────────────────────────────────

  describe('findEnvFiles', () => {
    it('finds .env in project root', async () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=3000');
      const parser = new EnvParser(tmpDir);
      const files = await parser.findEnvFiles();
      expect(files).toEqual(['.env']);
    });

    it('finds multiple .env files', async () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=3000');
      fs.writeFileSync(path.join(tmpDir, '.env.local'), 'API_KEY=abc');
      fs.writeFileSync(path.join(tmpDir, '.env.production'), 'DB=prod');
      const parser = new EnvParser(tmpDir);
      const files = await parser.findEnvFiles();
      expect(files.sort()).toEqual(['.env', '.env.local', '.env.production']);
    });

    it('excludes .env.example by default', async () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=3000');
      fs.writeFileSync(path.join(tmpDir, '.env.example'), 'PORT=');
      const parser = new EnvParser(tmpDir);
      const files = await parser.findEnvFiles();
      expect(files).toEqual(['.env']);
    });

    it('excludes .env.sample by default', async () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=3000');
      fs.writeFileSync(path.join(tmpDir, '.env.sample'), 'PORT=');
      const parser = new EnvParser(tmpDir);
      const files = await parser.findEnvFiles();
      expect(files).toEqual(['.env']);
    });

    it('respects custom exclude list', async () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=3000');
      fs.writeFileSync(path.join(tmpDir, '.env.test'), 'PORT=9999');
      fs.writeFileSync(path.join(tmpDir, '.env.local'), 'KEY=val');
      const parser = new EnvParser(tmpDir, ['.env.test']);
      const files = await parser.findEnvFiles();
      expect(files.sort()).toEqual(['.env', '.env.local']);
    });

    it('returns empty array when no .env files exist', async () => {
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# hello');
      const parser = new EnvParser(tmpDir);
      const files = await parser.findEnvFiles();
      expect(files).toEqual([]);
    });

    it('ignores non-.env files', async () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=3000');
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules');
      const parser = new EnvParser(tmpDir);
      const files = await parser.findEnvFiles();
      expect(files).toEqual(['.env']);
    });
  });

  // ── parseEnvFile ─────────────────────────────────────────────────────

  describe('parseEnvFile', () => {
    it('parses simple key=value pairs', () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=3000\nHOST=localhost');
      const parser = new EnvParser(tmpDir);
      const result = parser.parseEnvFile('.env');
      expect(result).toEqual({ PORT: '3000', HOST: 'localhost' });
    });

    it('parses values with equals signs', () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'URL=postgres://user:pass@host/db?ssl=true');
      const parser = new EnvParser(tmpDir);
      const result = parser.parseEnvFile('.env');
      expect(result).toEqual({ URL: 'postgres://user:pass@host/db?ssl=true' });
    });

    it('handles empty values', () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'EMPTY=\nFILLED=yes');
      const parser = new EnvParser(tmpDir);
      const result = parser.parseEnvFile('.env');
      expect(result).toEqual({ EMPTY: '', FILLED: 'yes' });
    });

    it('handles quoted values', () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'MSG="hello world"\nOTHER=\'single\'');
      const parser = new EnvParser(tmpDir);
      const result = parser.parseEnvFile('.env');
      expect(result).toEqual({ MSG: 'hello world', OTHER: 'single' });
    });

    it('skips comments and blank lines', () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), '# this is a comment\n\nPORT=3000\n\n# another comment\nHOST=localhost');
      const parser = new EnvParser(tmpDir);
      const result = parser.parseEnvFile('.env');
      expect(result).toEqual({ PORT: '3000', HOST: 'localhost' });
    });

    it('throws for missing file', () => {
      const parser = new EnvParser(tmpDir);
      expect(() => parser.parseEnvFile('.env.missing')).toThrow('File not found');
    });

    it('handles empty file', () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), '');
      const parser = new EnvParser(tmpDir);
      const result = parser.parseEnvFile('.env');
      expect(result).toEqual({});
    });
  });

  // ── getAllEnvVariables ───────────────────────────────────────────────

  describe('getAllEnvVariables', () => {
    it('collects variables from multiple files', async () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=3000');
      fs.writeFileSync(path.join(tmpDir, '.env.local'), 'API_KEY=secret');
      const parser = new EnvParser(tmpDir);
      const vars = await parser.getAllEnvVariables();
      expect(vars).toEqual(expect.arrayContaining([
        { file: '.env', key: 'PORT', value: '3000' },
        { file: '.env.local', key: 'API_KEY', value: 'secret' },
      ]));
      expect(vars).toHaveLength(2);
    });

    it('returns empty array when no .env files found', async () => {
      const parser = new EnvParser(tmpDir);
      const vars = await parser.getAllEnvVariables();
      expect(vars).toEqual([]);
    });

    it('skips excluded files', async () => {
      fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=3000');
      fs.writeFileSync(path.join(tmpDir, '.env.example'), 'PORT=');
      const parser = new EnvParser(tmpDir);
      const vars = await parser.getAllEnvVariables();
      expect(vars).toEqual([{ file: '.env', key: 'PORT', value: '3000' }]);
    });
  });

  // ── formatForAWS ────────────────────────────────────────────────────

  describe('formatForAWS', () => {
    it('formats variables with file.key pattern', () => {
      const parser = new EnvParser(tmpDir);
      const result = parser.formatForAWS([
        { file: '.env', key: 'PORT', value: '3000' },
        { file: '.env.local', key: 'API_KEY', value: 'secret' },
      ]);
      expect(result).toEqual({
        '.env.PORT': '3000',
        '.env.local.API_KEY': 'secret',
      });
    });

    it('handles empty array', () => {
      const parser = new EnvParser(tmpDir);
      const result = parser.formatForAWS([]);
      expect(result).toEqual({});
    });

    it('handles multiple variables from the same file', () => {
      const parser = new EnvParser(tmpDir);
      const result = parser.formatForAWS([
        { file: '.env', key: 'PORT', value: '3000' },
        { file: '.env', key: 'HOST', value: 'localhost' },
      ]);
      expect(result).toEqual({
        '.env.PORT': '3000',
        '.env.HOST': 'localhost',
      });
    });
  });

  // ── parseFromAWS ───────────────────────────────────────────────────

  describe('parseFromAWS', () => {
    it('reconstructs file map from AWS data', () => {
      const parser = new EnvParser(tmpDir);
      const result = parser.parseFromAWS({
        '.env.PORT': '3000',
        '.env.HOST': 'localhost',
        '.env.local.API_KEY': 'secret',
      });
      expect(result.get('.env')).toEqual({ PORT: '3000', HOST: 'localhost' });
      expect(result.get('.env.local')).toEqual({ API_KEY: 'secret' });
      expect(result.size).toBe(2);
    });

    it('handles empty data', () => {
      const parser = new EnvParser(tmpDir);
      const result = parser.parseFromAWS({});
      expect(result.size).toBe(0);
    });

    it('skips keys without a dot separator', () => {
      const parser = new EnvParser(tmpDir);
      const result = parser.parseFromAWS({
        'NOFILE': 'value',
        '.env.PORT': '3000',
      });
      expect(result.size).toBe(1);
      expect(result.get('.env')).toEqual({ PORT: '3000' });
    });

    it('handles values containing dots', () => {
      const parser = new EnvParser(tmpDir);
      const result = parser.parseFromAWS({
        '.env.URL': 'https://api.example.com',
      });
      expect(result.get('.env')).toEqual({ URL: 'https://api.example.com' });
    });

    it('roundtrips through formatForAWS and parseFromAWS', () => {
      const parser = new EnvParser(tmpDir);
      const original = [
        { file: '.env', key: 'PORT', value: '3000' },
        { file: '.env', key: 'HOST', value: 'localhost' },
        { file: '.env.local', key: 'SECRET', value: 'abc123' },
      ];
      const aws = parser.formatForAWS(original);
      const restored = parser.parseFromAWS(aws);

      expect(restored.get('.env')).toEqual({ PORT: '3000', HOST: 'localhost' });
      expect(restored.get('.env.local')).toEqual({ SECRET: 'abc123' });
    });
  });
});
