import { Injectable, OnModuleInit, OnModuleDestroy, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { randomUUID, createHash } from 'node:crypto';
import { validDate, seoulDate, parseMeals, parseVehicles, parseStops, eventLinks, parseEvent } from './parsers';
type Snapshot = Record<string, any>;
@Injectable()
export class FeedsService implements OnModuleInit, OnModuleDestroy {
  private cache?: Redis;
  private queueConnection?: Redis;
  private workerConnection?: Redis;
  private queue?: Queue;
  private worker?: Worker;
  private pending = new Map<string, Promise<Snapshot>>();
  private metrics = { cacheHits:0, sourceFetches:0, coalesced:0 };
  async onModuleInit() {
    if (process.env.REDIS_CACHE_URL) { this.cache = new Redis(process.env.REDIS_CACHE_URL, {maxRetriesPerRequest:1}); this.cache.on('error', () => {}); }
    if (process.env.REDIS_QUEUE_URL && this.cache) {
      this.queueConnection = new Redis(process.env.REDIS_QUEUE_URL, {maxRetriesPerRequest:null}); this.queueConnection.on('error', () => {});
      this.queue = new Queue('campus-feeds', {connection:this.queueConnection as any});
      this.workerConnection = this.queueConnection.duplicate();
      this.worker = new Worker('campus-feeds', async job => this.refresh(job.name), {connection:this.workerConnection as any,concurrency:1});
      this.worker.on('error', () => {});
      // Scheduling is asynchronous so missing infrastructure yields an honest health response.
      void this.schedule().catch(() => {});
    }
  }
  private async schedule() {
    for (const [name, every] of [['shuttle',60000],['meals',1800000],['events',21600000]] as const) await this.queue!.upsertJobScheduler(name, {every}, {name,opts:{attempts:2,backoff:{type:'exponential',delay:30000},removeOnComplete:30,removeOnFail:30}});
  }
  health() { return {service:'worker-server',status:this.cache?.status === 'ready' && this.queueConnection?.status === 'ready' && this.workerConnection?.status === 'ready' && process.env.INTERNAL_API_KEY ? 'ok':'configuration_required_or_unavailable', metrics:this.metrics}; }
  private async read(url: string, init?: RequestInit) {
    this.metrics.sourceFetches++;
    const response = await fetch(url, {...init,signal:AbortSignal.timeout(10000),headers:{'User-Agent':'CampusPrototype/0.1',...init?.headers}});
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > 2000000) throw new Error('Source response too large');
    return text;
  }
  private async snapshot(key: string, ttl: number, fetcher: () => Promise<Snapshot>, unavailable: Snapshot) {
    if (!this.cache) return {...unavailable,message:'REDIS_CACHE_URL configuration required'};
    const cache = this.cache;
    const existing = await cache.get(`campus:${key}`).catch(() => null);
    if (existing) { this.metrics.cacheHits++; return JSON.parse(existing); }
    const pending = this.pending.get(key); if (pending) {this.metrics.coalesced++; return pending;}
    const task = (async () => {
      const token = randomUUID();
      const locked = await cache.set(`campus:lock:${key}`,token,'PX',120000,'NX').catch(() => null);
      if (!locked) return {...unavailable,message:'Source refresh pending or cache unavailable'};
      try {
        let result: Snapshot;
        try { result = await fetcher(); }
        catch (error) { result = {...unavailable,message:error instanceof Error ? error.message : 'Source unavailable'}; }
        const digest = createHash('sha256').update(JSON.stringify(result)).digest('hex');
        const previousDigest = await cache.get(`campus:digest:${key}`);
        result.fetchedAt = new Date().toISOString();
        await cache.set(`campus:${key}`,JSON.stringify(result),'EX',result.status === 'unavailable' ? Math.min(ttl,60) : ttl);
        await cache.set(`campus:status:${key.split(':')[0]}`,JSON.stringify(result),'EX',86400);
        if (previousDigest !== digest) {
          await cache.set(`campus:digest:${key}`,digest,'EX',86400);
          await cache.publish('prototype:domain-events',JSON.stringify({id:randomUUID(),type:'campus.changed',entityId:key,audience:{kind:'public'}}));
        }
        return result;
      } finally { await cache.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",1,`campus:lock:${key}`,token).catch(() => {}); }
    })().finally(() => this.pending.delete(key));
    this.pending.set(key,task); return task;
  }
  meals(date = seoulDate()) {
    if (!validDate(date)) throw new BadRequestException('date must be YYYY-MM-DD');
    const sourceUrl = `https://snuco.snu.ac.kr/foodmenu/?date=${date}`;
    const base = {sourceUrl,date,fetchedAt:null,status:'unavailable',items:[]};
    return this.snapshot(`meals:${date}`,1800,async () => ({...base,status:'available',items:parseMeals(await this.read(sourceUrl),date)}),base);
  }
  shuttle(routeId = '41946') {
    if (!['41946','41914'].includes(routeId)) throw new BadRequestException('Unsupported shuttle route');
    const sourceUrl = `https://web.busin.co.kr/BuslineCircleS.aspx?cd=snu_1&di=${routeId}&tab=F`;
    const base = {sourceUrl,fetchedAt:null,observedAt:null,status:'unavailable',positionKind:'schematic',vehicles:[],stops:[]};
    return this.snapshot(`shuttle:${routeId}`,60,async () => {
      const stopKey = `campus:stops:${routeId}`;
      const cached = await this.cache!.get(stopKey);
      const stops = cached ? JSON.parse(cached) : parseStops(await this.read(sourceUrl));
      if (!cached) await this.cache!.set(stopKey,JSON.stringify(stops),'EX',86400);
      const vehicles = parseVehicles(JSON.parse(await this.read('https://web.busin.co.kr/BuslineCircleS.aspx/GetRoute',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({data:`,F,${routeId},snu_1`})})));
      return {...base,status:vehicles.length ? 'available':'no_vehicles',vehicles,stops};
    },base);
  }
  events() {
    const sourceUrl = 'https://www.snu.ac.kr/snunow/events';
    return this.snapshot('events:official',21600,async () => {
      const links = eventLinks(await this.read(sourceUrl));
      if (!links.length) throw new Error('Official event list structure unavailable');
      const items = [], skipped = [];
      for (const url of links) {
        try { const item = parseEvent(await this.read(url),url); if(item) items.push(item); else skipped.push({sourceUrl:url,reason:'Explicit activity start/end time and location not found'}); }
        catch { skipped.push({sourceUrl:url,reason:'Detail unavailable'}); }
      }
      if (!process.env.MAIN_INTERNAL_URL || !process.env.INTERNAL_API_KEY) return {sourceUrl,status:'unavailable',items:[],skipped,message:'Main import configuration required'};
      const response = await fetch(`${process.env.MAIN_INTERNAL_URL}/v1/internal/events/import`,{method:'POST',headers:{'Content-Type':'application/json','x-internal-key':process.env.INTERNAL_API_KEY},body:JSON.stringify({items}),signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error(`Main import returned HTTP ${response.status}`);
      return {sourceUrl,status:'available',imported:items.length,skipped,summary:await response.json()};
    },{sourceUrl,status:'unavailable',items:[]});
  }
  async refresh(source: string, force = false) {
    if (!['meals','shuttle','events'].includes(source)) throw new BadRequestException('Unknown integration');
    if (force && this.cache) {
      const last = JSON.parse(await this.cache.get(`campus:status:${source}`) || '{}');
      // At most one real source refresh per minute, including administrative requests.
      if (!last.fetchedAt || Date.now() - Date.parse(last.fetchedAt) >= 60000) {
        const keys = source === 'meals' ? [`campus:meals:${seoulDate()}`] : source === 'shuttle' ? ['campus:shuttle:41946','campus:shuttle:41914'] : ['campus:events:official'];
        await this.cache.del(...keys);
      }
    }
    if (source === 'meals') return this.meals();
    if (source === 'shuttle') return {items:await Promise.all([this.shuttle('41946'),this.shuttle('41914')])};
    if (source === 'events') return this.events();
    throw new BadRequestException('Unknown integration');
  }
  async status() {
    if (!this.cache) throw new ServiceUnavailableException('REDIS_CACHE_URL configuration required');
    const items = await Promise.all(['meals','shuttle','events'].map(async source => ({source,...JSON.parse(await this.cache!.get(`campus:status:${source}`) || '{"status":"unavailable","message":"No collection yet"}')})));
    return {items,metrics:this.metrics};
  }
  async onModuleDestroy() { await this.worker?.close(); await this.queue?.close(); this.workerConnection?.disconnect(); this.queueConnection?.disconnect(); this.cache?.disconnect(); }
}
