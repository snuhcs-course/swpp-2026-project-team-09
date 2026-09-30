import { StandardSchemaValidationPipe } from '@nestjs/common';
import { Payload, RpcException } from '@nestjs/microservices';
import { z } from 'zod';

// Message handlers get no global pipe, because main.ts connects messaging without `inheritAppConfig`.
class MessageValidationPipe extends StandardSchemaValidationPipe {
  constructor() {
    super();
    // Named as the HTTP routes name a field, and in one string, as Nest's answer to an error in a handler has it.
    this.exceptionFactory = (issues): RpcException =>
      new RpcException({ status: 'error', message: this.formatIssueMessages(issues).join('; ') });
  }
}

// The payload of a message from the worker server, checked against `schema` before the handler runs. A message that
// does not match is refused with `{ status: 'error', message }`, and the handler does not run.
export function WorkerMessage(schema: z.ZodType): ParameterDecorator {
  return Payload({ schema, pipes: [new MessageValidationPipe()] });
}

// The answer to a worker message that was handled.
export const HANDLED = { status: 'ok' } as const;

export type Handled = typeof HANDLED;
