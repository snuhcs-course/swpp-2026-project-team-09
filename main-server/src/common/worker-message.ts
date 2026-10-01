import { StandardSchemaValidationPipe } from '@nestjs/common';
import { Payload, RpcException } from '@nestjs/microservices';
import { z } from 'zod';

// main.ts connects messaging without `inheritAppConfig`, so the global pipe never reaches a message handler.
class MessageValidationPipe extends StandardSchemaValidationPipe {
  constructor() {
    super();
    // Nest answers a string as `{ status: 'error', message }`, the form of its answer to an error in a handler.
    this.exceptionFactory = (issues): RpcException => new RpcException(this.formatIssueMessages(issues).join('; '));
  }
}

// The payload of a message from the worker server. One that does not match `schema` is refused before the handler
// runs, with an answer that names each problem.
export function WorkerMessage(schema: z.ZodType): ParameterDecorator {
  return Payload({ schema, pipes: [new MessageValidationPipe()] });
}

// The answer to a message that was handled.
export const HANDLED = { status: 'ok' } as const;

export type Handled = typeof HANDLED;
