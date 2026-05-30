import { AWSSecretsManager } from './aws-secrets';

// Mock the entire AWS SDK modules
jest.mock('@aws-sdk/client-secrets-manager', () => {
  const mockSend = jest.fn();

  return {
    SecretsManagerClient: jest.fn(() => ({ send: mockSend })),
    GetSecretValueCommand: jest.fn((input) => ({ ...input, _type: 'GetSecretValue' })),
    CreateSecretCommand: jest.fn((input) => ({ ...input, _type: 'CreateSecret' })),
    UpdateSecretCommand: jest.fn((input) => ({ ...input, _type: 'UpdateSecret' })),
    DescribeSecretCommand: jest.fn((input) => ({ ...input, _type: 'DescribeSecret' })),
    ResourceNotFoundException: class ResourceNotFoundException extends Error {
      constructor() {
        super('Resource not found');
        this.name = 'ResourceNotFoundException';
      }
    },
    __mockSend: mockSend,
  };
});

jest.mock('@aws-sdk/credential-provider-sso', () => ({
  fromSSO: jest.fn(() => 'mock-credentials'),
}));

// Get the mock send function
function getMockSend() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@aws-sdk/client-secrets-manager').__mockSend as jest.Mock;
}

function getResourceNotFoundException() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@aws-sdk/client-secrets-manager').ResourceNotFoundException;
}

describe('AWSSecretsManager', () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = getMockSend();
    mockSend.mockReset();
  });

  // ── secretExists ───────────────────────────────────────────────────

  describe('secretExists', () => {
    it('returns true when secret exists', async () => {
      mockSend.mockResolvedValueOnce({});
      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      const exists = await aws.secretExists('my-project');
      expect(exists).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('returns false when secret does not exist', async () => {
      const ResourceNotFoundException = getResourceNotFoundException();
      mockSend.mockRejectedValueOnce(new ResourceNotFoundException());
      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      const exists = await aws.secretExists('nonexistent');
      expect(exists).toBe(false);
    });

    it('throws on unexpected errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('network failure'));
      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      await expect(aws.secretExists('my-project')).rejects.toThrow('network failure');
    });
  });

  // ── uploadSecret ──────────────────────────────────────────────────

  describe('uploadSecret', () => {
    it('creates a new secret when it does not exist', async () => {
      const ResourceNotFoundException = getResourceNotFoundException();
      // First call: DescribeSecret (secretExists check) — not found
      mockSend.mockRejectedValueOnce(new ResourceNotFoundException());
      // Second call: CreateSecret
      mockSend.mockResolvedValueOnce({});

      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      await aws.uploadSecret('new-project', { PORT: '3000' });

      expect(mockSend).toHaveBeenCalledTimes(2);
      const createCall = mockSend.mock.calls[1][0];
      expect(createCall._type).toBe('CreateSecret');
      expect(createCall.Name).toBe('new-project');
      expect(JSON.parse(createCall.SecretString)).toEqual({ PORT: '3000' });
    });

    it('updates an existing secret', async () => {
      // First call: DescribeSecret — exists
      mockSend.mockResolvedValueOnce({});
      // Second call: UpdateSecret
      mockSend.mockResolvedValueOnce({});

      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      await aws.uploadSecret('existing-project', { PORT: '4000' });

      expect(mockSend).toHaveBeenCalledTimes(2);
      const updateCall = mockSend.mock.calls[1][0];
      expect(updateCall._type).toBe('UpdateSecret');
      expect(updateCall.SecretId).toBe('existing-project');
    });

    it('serializes data as JSON', async () => {
      const ResourceNotFoundException = getResourceNotFoundException();
      mockSend.mockRejectedValueOnce(new ResourceNotFoundException());
      mockSend.mockResolvedValueOnce({});

      const data = { '.env.PORT': '3000', '.env.local.KEY': 'secret' };
      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      await aws.uploadSecret('test', data);

      const createCall = mockSend.mock.calls[1][0];
      expect(JSON.parse(createCall.SecretString)).toEqual(data);
    });
  });

  // ── getSecret ─────────────────────────────────────────────────────

  describe('getSecret', () => {
    it('returns parsed secret data', async () => {
      const secretData = { '.env.PORT': '3000', '.env.HOST': 'localhost' };
      mockSend.mockResolvedValueOnce({ SecretString: JSON.stringify(secretData) });

      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      const result = await aws.getSecret('my-project');
      expect(result).toEqual(secretData);
    });

    it('throws when secret not found', async () => {
      const ResourceNotFoundException = getResourceNotFoundException();
      mockSend.mockRejectedValueOnce(new ResourceNotFoundException());

      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      await expect(aws.getSecret('missing')).rejects.toThrow('Secret not found: missing');
    });

    it('throws when secret has no string value', async () => {
      mockSend.mockResolvedValueOnce({ SecretString: undefined });

      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      await expect(aws.getSecret('binary-secret')).rejects.toThrow('Secret has no string value');
    });

    it('throws on unexpected errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('access denied'));

      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      await expect(aws.getSecret('forbidden')).rejects.toThrow('access denied');
    });
  });

  // ── testConnection ────────────────────────────────────────────────

  describe('testConnection', () => {
    it('returns true when AWS is reachable', async () => {
      mockSend.mockResolvedValueOnce({});
      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      const result = await aws.testConnection();
      expect(result).toBe(true);
    });

    it('returns true even when secret not found (connection works)', async () => {
      const ResourceNotFoundException = getResourceNotFoundException();
      mockSend.mockRejectedValueOnce(new ResourceNotFoundException());

      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      const result = await aws.testConnection();
      expect(result).toBe(true);
    });

    it('returns false when connection fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('connection refused'));
      const aws = new AWSSecretsManager({ region: 'us-east-1', profile: 'test' });
      const result = await aws.testConnection();
      expect(result).toBe(false);
    });
  });

  // ── Constructor ───────────────────────────────────────────────────

  describe('constructor', () => {
    it('defaults to us-east-1 region', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
      new AWSSecretsManager({});
      expect(SecretsManagerClient).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'us-east-1' })
      );
    });

    it('uses provided region', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
      new AWSSecretsManager({ region: 'eu-west-1' });
      expect(SecretsManagerClient).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'eu-west-1' })
      );
    });
  });
});
