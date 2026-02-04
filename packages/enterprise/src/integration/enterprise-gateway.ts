/**
 * Enterprise Gateway
 *
 * Main entry point that wires together all enterprise layers:
 * 1. License validation
 * 2. Permission checks (governance)
 * 3. Audit logging
 * 4. Execution on OpenClaw
 */

import { OpenClawAdapter, OpenClawAction, OpenClawResult } from './openclaw-adapter.js';
import { PermissionMiddleware, UserContext } from '../middleware/permission-middleware.js';
import { AuditMiddleware } from '../middleware/audit-middleware.js';
import { LicenseValidator } from '../licensing/license-validator.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export interface EnterpriseConfig {
  openclaw: {
    baseUrl: string;
    timeout?: number;
  };
  license?: {
    publicKeyPath: string;
    licenseKey?: string;
  };
  audit: {
    logPath: string;
  };
}

export class EnterpriseGateway {
  private openclawAdapter: OpenClawAdapter;
  private permissionMiddleware: PermissionMiddleware;
  private auditMiddleware: AuditMiddleware;
  private licenseValidator?: LicenseValidator;
  private initialized = false;

  constructor(private config: EnterpriseConfig) {
    this.openclawAdapter = new OpenClawAdapter({
      baseUrl: config.openclaw.baseUrl,
      timeout: config.openclaw.timeout
    });

    this.permissionMiddleware = new PermissionMiddleware();
    this.auditMiddleware = new AuditMiddleware(config.audit.logPath);

    if (config.license) {
      this.licenseValidator = new LicenseValidator({
        publicKeyPath: config.license.publicKeyPath,
        cachePath: './cache/license',
        enableMachineBinding: true
      });
    }
  }

  /**
   * Initialize gateway
   */
  async initialize(): Promise<void> {
    logger.info('🚀 Initializing Enterprise Gateway...');

    // Initialize audit log
    await this.auditMiddleware.initialize();
    logger.info('✓ Audit middleware initialized');

    // Validate license (if configured)
    if (this.licenseValidator && this.config.license?.licenseKey) {
      const licenseResult = await this.licenseValidator.validate(this.config.license.licenseKey);
      if (!licenseResult.valid) {
        throw new Error(`License validation failed: ${licenseResult.reason}`);
      }
      logger.info('✓ License validated successfully');
      logger.info(`  Tier: ${licenseResult.payload?.tier}`);
      logger.info(`  Features: ${licenseResult.payload?.features.join(', ')}`);
    } else {
      logger.info('⚠️  No license configured (running with core features only)');
    }

    // Check OpenClaw health
    const openclawHealthy = await this.openclawAdapter.healthCheck();
    if (!openclawHealthy) {
      logger.warn('⚠️  OpenClaw health check failed - may not be running at ' + this.config.openclaw.baseUrl);
      logger.warn('   Gateway will still accept requests but execution may fail');
    } else {
      logger.info('✓ OpenClaw connection verified at ' + this.config.openclaw.baseUrl);
    }

    this.initialized = true;
    logger.info('✅ Enterprise Gateway initialization complete!');
  }

  /**
   * Execute action with enterprise layers
   *
   * Flow:
   * 1. Check permission
   * 2. Execute on OpenClaw
   * 3. Audit log
   */
  async execute(action: OpenClawAction, context: UserContext): Promise<OpenClawResult> {
    if (!this.initialized) {
      throw new Error('Gateway not initialized - call initialize() first');
    }

    const startTime = Date.now();

    // ============ LAYER 1: PERMISSION CHECK ============
    logger.debug({ action, context }, 'Checking permissions');

    const permissionCheck = await this.permissionMiddleware.checkPermission(action, context);

    if (!permissionCheck.allowed) {
      // Log denial to audit
      const denialResult: OpenClawResult = {
        success: false,
        error: `Permission denied: ${permissionCheck.reason}`,
        metadata: {
          timestamp: Date.now(),
          latency: `${Date.now() - startTime}ms`
        }
      };

      await this.auditMiddleware.logAction(
        action,
        context,
        denialResult,
        false,
        permissionCheck.reason
      );

      logger.warn({ action, context, reason: permissionCheck.reason }, 'Permission denied');

      return denialResult;
    }

    logger.debug({ action }, 'Permission granted, executing on OpenClaw');

    // ============ LAYER 2: EXECUTE ON OPENCLAW ============
    let result: OpenClawResult;

    try {
      result = await this.openclawAdapter.execute(action);
      logger.debug({ action, result: result.success }, 'OpenClaw execution complete');
    } catch (error) {
      // Should not happen (adapter handles errors), but just in case
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: Date.now(),
          latency: `${Date.now() - startTime}ms`
        }
      };
      logger.error({ error, action }, 'OpenClaw execution error');
    }

    // ============ LAYER 3: AUDIT LOG ============
    await this.auditMiddleware.logAction(
      action,
      context,
      result,
      true // Permission was allowed
    );

    logger.info({
      action: action.type,
      userId: context.userId,
      success: result.success,
      latency: Date.now() - startTime
    }, 'Action completed');

    return result;
  }

  /**
   * Get OpenClaw health status
   */
  async getOpenClawHealth(): Promise<boolean> {
    return this.openclawAdapter.healthCheck();
  }

  /**
   * Check if gateway is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get supported action types
   */
  getSupportedActions(): string[] {
    return this.permissionMiddleware.getSupportedActions();
  }

  /**
   * Get all capabilities
   */
  getAllCapabilities(): string[] {
    return this.permissionMiddleware.getAllCapabilities();
  }
}
