/**
 * Audit Logger - Tamper-proof audit trail
 * Original implementation
 */

import { createWriteStream, WriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { AuditLogEntry } from '../types.js';

export class AuditLogger {
  private stream: WriteStream | null = null;
  private logPath: string;
  private previousHash: string = '';

  constructor(private baseDir: string = './data/audit-logs') {
    const date = new Date().toISOString().split('T')[0];
    this.logPath = join(baseDir, `audit-${date}.jsonl`);
  }

  async initialize(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
    this.stream = createWriteStream(this.logPath, { flags: 'a' });
  }

  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    if (!this.stream) {
      throw new Error('AuditLogger not initialized');
    }

    const fullEntry: AuditLogEntry & { hash: string; previousHash: string } = {
      ...entry,
      timestamp: new Date(),
      hash: '',
      previousHash: this.previousHash,
    };

    // Create tamper-proof hash chain
    const entryJson = JSON.stringify(fullEntry);
    const hash = createHash('sha256')
      .update(entryJson + this.previousHash)
      .digest('hex');

    fullEntry.hash = hash;
    this.previousHash = hash;

    // Write to append-only log
    this.stream.write(JSON.stringify(fullEntry) + '\n');
  }

  async close(): Promise<void> {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }
}
