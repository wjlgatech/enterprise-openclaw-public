/**
 * Audit Middleware
 *
 * Simple audit logger for Phase 1 (JSONL format)
 * Phase 3 will upgrade to immutable ledger with blockchain-style hashing
 */

import { OpenClawAction, OpenClawResult } from '../integration/openclaw-adapter.js';
import { UserContext } from './permission-middleware.js';
import { writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

export interface AuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  tenantId?: string;
  action: {
    type: string;
    params: Record<string, unknown>;
  };
  result: {
    success: boolean;
    error?: string;
  };
  permission: {
    allowed: boolean;
    reason?: string;
  };
}

export class AuditMiddleware {
  private auditLogPath: string;

  constructor(auditLogPath: string = './logs/audit.jsonl') {
    this.auditLogPath = auditLogPath;
  }

  /**
   * Initialize audit log directory
   */
  async initialize(): Promise<void> {
    const dir = dirname(this.auditLogPath);

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * Log an action (after execution)
   */
  async logAction(
    action: OpenClawAction,
    context: UserContext,
    result: OpenClawResult,
    permissionAllowed: boolean,
    permissionReason?: string
  ): Promise<void> {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      userId: context.userId,
      tenantId: context.tenantId,
      action: {
        type: action.type,
        params: action.params
      },
      result: {
        success: result.success,
        error: result.error
      },
      permission: {
        allowed: permissionAllowed,
        reason: permissionReason
      }
    };

    // Append to JSONL file (one JSON per line)
    const line = JSON.stringify(entry) + '\n';

    try {
      await appendFile(this.auditLogPath, line, 'utf-8');
    } catch (error) {
      // If file doesn't exist, create it
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        await this.initialize();
        await appendFile(this.auditLogPath, line, 'utf-8');
      } else {
        throw error;
      }
    }
  }

  /**
   * Query audit log
   *
   * Simple version for Phase 1 - returns empty array
   * Phase 3 will implement full querying with filtering, indexing, etc.
   */
  async query(filter?: {
    userId?: string;
    actionType?: string;
    limit?: number;
  }): Promise<AuditEntry[]> {
    // Phase 1: Simple implementation
    // Phase 3: Will implement full querying:
    // - Read JSONL file
    // - Parse entries
    // - Filter by userId, actionType, date range
    // - Apply limit
    // - Return results

    return [];
  }

  /**
   * Generate unique audit entry ID
   */
  private generateId(): string {
    // Format: audit_<timestamp>_<random>
    // Example: audit_1706918400000_a3b9c2
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `audit_${timestamp}_${random}`;
  }

  /**
   * Get audit log file path
   */
  getAuditLogPath(): string {
    return this.auditLogPath;
  }
}
