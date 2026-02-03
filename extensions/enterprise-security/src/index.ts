/**
 * Enterprise Security Plugin
 * Provides PII detection, audit logging, and multi-tenancy
 */

import type { EnterprisePlugin } from '../../common/plugin';
import { PIIDetector } from '../../../src/security/pii-detector';
import { AuditLogger } from '../../../src/security/audit-logger';

export const plugin: EnterprisePlugin = {
  metadata: {
    id: 'enterprise-security',
    name: 'Enterprise Security',
    version: '1.0.0',
    description: 'PII detection, audit logging, and compliance features',
  },

  async register(api) {
    const piiDetector = new PIIDetector();
    const auditLogger = new AuditLogger('./data/audit-logs');
    await auditLogger.initialize();

    // Hook into session messages to detect PII
    api.on('session.message', async (data: any) => {
      const { message, sessionKey, userId } = data;

      if (message?.content) {
        const result = piiDetector.detect(message.content);

        if (result.hasPII) {
          // Mask PII in message
          message.content = result.maskedText;

          // Log to audit trail
          await auditLogger.log({
            tenantId: data.tenantId || 'default',
            userId: userId || 'system',
            sessionId: sessionKey || 'unknown',
            action: 'pii.detected',
            resource: 'message',
            outcome: 'success',
            piiDetected: true,
            piiMasked: true,
            metadata: {
              entityCount: result.entities.length,
              entityTypes: result.entities.map(e => e.type),
            },
          });
        }
      }
    });

    // Hook into agent execution to log actions
    api.on('agent.complete', async (data: any) => {
      await auditLogger.log({
        tenantId: data.tenantId || 'default',
        userId: data.userId || 'system',
        sessionId: data.sessionKey || 'unknown',
        action: 'agent.execute',
        resource: data.agentId,
        outcome: 'success',
        piiDetected: false,
        piiMasked: false,
        metadata: {
          duration: data.duration,
          tools: data.toolsUsed,
        },
      });
    });

    // Register gateway methods
    api.registerMethod('security.scanPII', async (params) => {
      const result = piiDetector.detect(params.text);
      return {
        hasPII: result.hasPII,
        entities: result.entities,
        maskedText: result.maskedText,
      };
    });

    api.registerMethod('security.getAuditLogs', async (params) => {
      // TODO: Implement audit log query
      return [];
    });

    console.log('✓ Enterprise Security plugin initialized');
  },

  async onGatewayStart(gateway) {
    console.log('Enterprise Security: Gateway started, audit logging active');
  },
};

export default plugin;
