#!/usr/bin/env node
/**
 * WebSocket Client Test
 * Verifies real-time audit updates are being broadcast
 */

import { io } from 'socket.io-client';

console.log('🔌 Connecting to WebSocket server...');

const socket = io('http://localhost:19000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log('📡 Socket ID:', socket.id);
  console.log('\n🎧 Listening for audit updates...\n');

  // Request initial dashboard update
  socket.emit('request-dashboard-update');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connected', (data) => {
  console.log('📨 Server welcome:', data.message);
});

socket.on('audit-update', (data) => {
  console.log('🔔 AUDIT UPDATE:', JSON.stringify(data, null, 2));
});

socket.on('audit-alert', (data) => {
  console.log('⚠️  AUDIT ALERT:', JSON.stringify(data, null, 2));
});

socket.on('audit-analytics-refresh', (data) => {
  console.log('📊 ANALYTICS REFRESH:', JSON.stringify(data, null, 2));
});

socket.on('dashboard-update', (data) => {
  console.log('📈 DASHBOARD UPDATE:', JSON.stringify(data, null, 2));
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

// Keep alive
console.log('Press Ctrl+C to exit\n');
process.on('SIGINT', () => {
  console.log('\n👋 Closing connection...');
  socket.close();
  process.exit(0);
});
