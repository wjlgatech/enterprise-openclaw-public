/**
 * Audit Stream - Event-Driven Audit Broadcasting
 *
 * Provides real-time streaming of audit events to connected clients.
 * Uses EventEmitter pattern for internal coordination and Socket.IO for external broadcast.
 */

import { EventEmitter } from 'events';
import type { Server as SocketIOServer } from 'socket.io';
import type { AuditEntry } from '../middleware/audit-middleware.js';

export interface AuditStreamEvent {
  type: 'new-entry' | 'alert' | 'analytics-update';
  entry?: AuditEntry;
  severity?: 'info' | 'warning' | 'critical';
  message?: string;
  timestamp: number;
}

export class AuditStream extends EventEmitter {
  private socketServer?: SocketIOServer;
  private subscribers: Set<(event: AuditStreamEvent) => void>;
  private eventHistory: AuditStreamEvent[];
  private maxHistorySize: number = 100;

  constructor(socketServer?: SocketIOServer) {
    super();
    this.socketServer = socketServer;
    this.subscribers = new Set();
    this.eventHistory = [];
  }

  /**
   * Broadcast a new audit entry to all connected clients
   */
  broadcastNewEntry(entry: AuditEntry): void {
    const event: AuditStreamEvent = {
      type: 'new-entry',
      entry,
      timestamp: Date.now()
    };

    // Emit to internal subscribers
    this.emit('new-audit-entry', event);

    // Add to history
    this.addToHistory(event);

    // Broadcast via WebSocket to all connected clients
    if (this.socketServer) {
      this.socketServer.emit('audit-update', {
        type: 'new-entry',
        entry,
        timestamp: event.timestamp
      });

      // Trigger analytics update
      this.socketServer.emit('audit-analytics-refresh', {
        timestamp: event.timestamp
      });
    }

    // Notify local subscribers
    this.subscribers.forEach(sub => sub(event));
  }

  /**
   * Broadcast an alert (denial, error, anomaly)
   */
  broadcastAlert(
    severity: 'warning' | 'critical',
    message: string,
    entry?: AuditEntry
  ): void {
    const event: AuditStreamEvent = {
      type: 'alert',
      severity,
      message,
      entry,
      timestamp: Date.now()
    };

    // Emit to internal subscribers
    this.emit('audit-alert', event);

    // Add to history
    this.addToHistory(event);

    // Broadcast via WebSocket
    if (this.socketServer) {
      this.socketServer.emit('audit-alert', {
        severity,
        message,
        entry,
        timestamp: event.timestamp
      });
    }

    // Notify local subscribers
    this.subscribers.forEach(sub => sub(event));
  }

  /**
   * Subscribe to audit events (internal)
   */
  subscribe(callback: (event: AuditStreamEvent) => void): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get recent event history
   */
  getRecentEvents(limit: number = 50): AuditStreamEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Add event to history with size limit
   */
  private addToHistory(event: AuditStreamEvent): void {
    this.eventHistory.push(event);

    // Keep history size under limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Clear all subscribers
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }
}
