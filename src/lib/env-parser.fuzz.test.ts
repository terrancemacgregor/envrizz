import * as fc from 'fast-check';
import { EnvParser } from './env-parser';

describe('EnvParser fuzz tests', () => {

  // ── Rule 1: Parser should never crash ──────────────────────────────────

  it('never crashes on arbitrary string input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = EnvParser.parseEnvString(input);
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      }),
      { numRuns: 5000 }
    );
  });

  it('never crashes on arbitrary unicode input', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme' }), (input: string) => {
        const result = EnvParser.parseEnvString(input);
        expect(result).toBeDefined();
      }),
      { numRuns: 2000 }
    );
  });

  // ── Rule 2: Parser should never hang ───────────────────────────────────

  it('completes within 100ms on any input up to 1MB', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1024 * 1024 }),
        (input) => {
          const start = Date.now();
          EnvParser.parseEnvString(input);
          const elapsed = Date.now() - start;
          expect(elapsed).toBeLessThan(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ── Rule 3: Output keys and values are always strings ──────────────────

  it('always returns string keys and string values', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = EnvParser.parseEnvString(input);
        for (const [key, value] of Object.entries(result)) {
          expect(typeof key).toBe('string');
          expect(typeof value).toBe('string');
        }
      }),
      { numRuns: 5000 }
    );
  });

  // ── Rule 4: Valid .env format always parses correctly ───────────────────

  it('correctly parses randomly generated valid key=value pairs', () => {
    const envKey = fc.stringMatching(/^[A-Z][A-Z0-9_]{0,30}$/);
    // Values that won't be transformed by the parser (no whitespace trimming, no quote stripping)
    const envValue = fc.string().filter(s =>
      !s.includes('\n') && !s.includes('\r') && s === s.trim() &&
      !((s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
        (s.startsWith("'") && s.endsWith("'") && s.length >= 2))
    );

    fc.assert(
      fc.property(
        fc.array(fc.tuple(envKey, envValue), { minLength: 1, maxLength: 50 }),
        (pairs) => {
          const input = pairs.map(([k, v]) => `${k}=${v}`).join('\n');
          const result = EnvParser.parseEnvString(input);

          // Last value for each key should win (duplicate handling)
          const expected: Record<string, string> = {};
          for (const [k, v] of pairs) {
            expected[k] = v;
          }

          for (const [k, v] of Object.entries(expected)) {
            expect(result[k]).toBe(v);
          }
        }
      ),
      { numRuns: 2000 }
    );
  });

  // ── Rule 5: Comments are never parsed as keys ──────────────────────────

  it('never includes comment lines as keys', () => {
    const commentLine = fc.string().map(s => `# ${s.replace(/\n/g, ' ')}`);
    const keyValueLine = fc.tuple(
      fc.stringMatching(/^[A-Z][A-Z0-9_]{0,10}$/),
      fc.string().filter(s => !s.includes('\n'))
    ).map(([k, v]) => `${k}=${v}`);

    fc.assert(
      fc.property(
        fc.array(fc.oneof(commentLine, keyValueLine), { minLength: 1, maxLength: 30 }),
        (lines) => {
          const input = lines.join('\n');
          const result = EnvParser.parseEnvString(input);
          for (const key of Object.keys(result)) {
            expect(key.startsWith('#')).toBe(false);
          }
        }
      ),
      { numRuns: 2000 }
    );
  });

  // ── Rule 6: Empty lines don't produce keys ─────────────────────────────

  it('empty lines never produce keys', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('', ' ', '\t', '  \t  '), { minLength: 1, maxLength: 100 }),
        (lines) => {
          const input = lines.join('\n');
          const result = EnvParser.parseEnvString(input);
          expect(Object.keys(result).length).toBe(0);
        }
      ),
      { numRuns: 1000 }
    );
  });

  // ── Rule 7: Prototype pollution is not possible ────────────────────────

  it('__proto__ and constructor keys do not pollute Object prototype', () => {
    fc.assert(
      fc.property(fc.string().filter(s => !s.includes('\n')), (value) => {
        const input = `__proto__=${value}\nconstructor=${value}\ntoString=${value}`;
        EnvParser.parseEnvString(input);

        // Parsing should not modify the global Object prototype
        const clean: Record<string, unknown> = {};
        expect(clean.toString).toBe(Object.prototype.toString);
        // A fresh object should not have any of these as own enumerable properties
        expect(Object.keys(clean)).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  // ── Rule 8: Quoted values have quotes stripped ─────────────────────────

  it('double-quoted values have quotes stripped', () => {
    const safeValue = fc.string().filter(s => !s.includes('\n') && !s.includes('"'));

    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z][A-Z0-9_]{0,10}$/),
        safeValue,
        (key, value) => {
          const input = `${key}="${value}"`;
          const result = EnvParser.parseEnvString(input);
          expect(result[key]).toBe(value);
        }
      ),
      { numRuns: 2000 }
    );
  });

  // ── Rule 9: Lines without = are skipped ────────────────────────────────

  it('lines without equals sign produce no keys', () => {
    const noEqualsLine = fc.string().filter(s => !s.includes('=') && !s.includes('\n'));

    fc.assert(
      fc.property(
        fc.array(noEqualsLine, { minLength: 1, maxLength: 50 }),
        (lines) => {
          const input = lines.join('\n');
          const result = EnvParser.parseEnvString(input);
          expect(Object.keys(result).length).toBe(0);
        }
      ),
      { numRuns: 2000 }
    );
  });

  // ── Rule 10: Adversarial patterns don't cause ReDoS ────────────────────

  it('pathological regex patterns complete quickly', () => {
    const evilPatterns = [
      'KEY=' + '"'.repeat(50000),
      'KEY=' + "'".repeat(50000),
      'KEY=' + '='.repeat(50000),
      'KEY=' + '#'.repeat(50000),
      'KEY=' + '\\'.repeat(50000),
      'A'.repeat(50000) + '=' + 'B'.repeat(50000),
      Array(10000).fill('K=V').join('\n'),
    ];

    for (const input of evilPatterns) {
      const start = Date.now();
      EnvParser.parseEnvString(input);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
    }
  });
});
