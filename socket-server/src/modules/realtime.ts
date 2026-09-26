import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { authenticate, parseHint } from './policy';
@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private io?: Server;
  private subscriber?: Redis;
  private subscribed = false;
  attach(http: any) {
    const origins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
    this.io = new Server(http, { cors: { origin: origins }, maxHttpBufferSize: 16384 });
    this.io.use((socket, next) => {
      try { socket.data.userId = authenticate(socket.handshake.auth?.token); next(); }
      catch { next(new Error(process.env.JWT_SECRET ? 'Authentication required' : 'Authentication configuration required')); }
    });
    this.io.on('connection', socket => {
      socket.join(['events:public', `user:${socket.data.userId}`]);
      // Rooms are server-owned. No client room/join/location handlers exist.
      const exp = JSON.parse(Buffer.from(socket.handshake.auth.token.split('.')[1], 'base64url').toString()).exp;
      const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, exp * 1000 - Date.now()));
      socket.once('disconnect', () => clearTimeout(expiry));
    });
    if (process.env.REDIS_CACHE_URL) {
      this.subscriber = new Redis(process.env.REDIS_CACHE_URL);
      this.subscriber.on('error', () => {});
      this.subscriber.on('close', () => { this.subscribed = false; });
      this.subscriber.subscribe('prototype:domain-events', error => { this.subscribed = !error; });
      this.subscriber.on('ready', () => { this.subscriber!.subscribe('prototype:domain-events', error => { this.subscribed = !error; }); });
      this.subscriber.on('message', (_, raw) => {
        const hint = parseHint(raw);
        if (hint) this.io?.to(hint.rooms).emit('domain.changed', hint.payload);
      });
    }
  }
  health() { return { service: 'socket-server', status: this.subscribed && this.subscriber?.status === 'ready' && process.env.JWT_SECRET ? 'ok' : 'configuration_required_or_unavailable' }; }
  async onModuleDestroy() { this.io?.close(); this.subscriber?.disconnect(); }
}
