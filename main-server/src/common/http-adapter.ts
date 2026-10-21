/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

// Production's load balancer refuses every path under /admin/ with case-sensitive patterns, so routes match case too,
// and /ADMIN/... cannot reach the administrator routes past it. Express reads the setting once, when it creates its
// router, and the adapter creates it at once: so the setting goes on the instance the adapter is given.
export function httpAdapter(): ExpressAdapter {
  return new ExpressAdapter(express().set('case sensitive routing', true));
}
