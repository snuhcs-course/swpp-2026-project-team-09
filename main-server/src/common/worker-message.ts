import { StandardSchemaValidationPipe } from '@nestjs/common';
import { Payload, RpcException } from '@nestjs/microservices';
import { z } from 'zod';

// Message handlers get no global pipe, because main.ts connects messaging without `inheritAppConfig`.
class MessageValidationPipe extends StandardSchemaValidationPipe {
  constructor() {
    super();
    // Nest answers a string as `{ status: 'error', message }`, the form of its answer to an error in a handler.
    this.exceptionFactory = (issues): RpcException => new RpcException(this.formatIssueMessages(issues).join('; '));
  }
}

// The payload of a message from the worker server. A payload that does not match `schema` is refused with an answer
// that names each problem, before the handler runs.
export function WorkerMessage(schema: z.ZodType): ParameterDecorator {
  return Payload({ schema, pipes: [new MessageValidationPipe()] });
}

export const HANDLED = { status: 'ok' } as const;

export type Handled = typeof HANDLED;
