import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  DescribeSecretCommand,
  ResourceNotFoundException
} from '@aws-sdk/client-secrets-manager';
import { fromSSO } from '@aws-sdk/credential-provider-sso';

export interface AWSConfig {
  region?: string;
  profile?: string;
  accountId?: string;
}

export class AWSSecretsManager {
  private client: SecretsManagerClient;
  private accountId: string;

  constructor(config: AWSConfig = {}) {
    const region = config.region || process.env.AWS_REGION || 'us-east-1';
    const profile = config.profile || process.env.AWS_PROFILE;
    this.accountId = config.accountId || process.env.AWS_ACCOUNT_ID || '';

    this.client = new SecretsManagerClient({
      region,
      credentials: fromSSO({ profile })
    });
  }

  private getSecretName(projectName: string): string {
    return projectName;
  }

  async secretExists(projectName: string): Promise<boolean> {
    const secretName = this.getSecretName(projectName);
    
    try {
      await this.client.send(new DescribeSecretCommand({
        SecretId: secretName
      }));
      return true;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        return false;
      }
      throw error;
    }
  }

  async uploadSecret(projectName: string, data: Record<string, string>): Promise<void> {
    const secretName = this.getSecretName(projectName);
    const secretString = JSON.stringify(data);

    const exists = await this.secretExists(projectName);

    if (exists) {
      await this.client.send(new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: secretString
      }));
      console.log(`Updated secret: ${secretName}`);
    } else {
      await this.client.send(new CreateSecretCommand({
        Name: secretName,
        SecretString: secretString,
        Description: `Environment variables for project: ${projectName}`
      }));
      console.log(`Created secret: ${secretName}`);
    }
  }

  async getSecret(projectName: string): Promise<Record<string, string>> {
    const secretName = this.getSecretName(projectName);

    try {
      const response = await this.client.send(new GetSecretValueCommand({
        SecretId: secretName
      }));

      if (response.SecretString) {
        return JSON.parse(response.SecretString);
      }

      throw new Error('Secret has no string value');
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        throw new Error(`Secret not found: ${secretName}`);
      }
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.send(new DescribeSecretCommand({
        SecretId: 'test-connection-check'
      }));
      return true;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        return true;
      }
      console.error('AWS connection test failed:', error);
      return false;
    }
  }
}