import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MESSAGING_CLIENT } from './messaging.module.js';

// The Users a signal is for, or every connected app.
export type SignalRecipients = readonly string[] | 'everyone';

// What every socket server receives as the event `signal`. Without userIds it goes to every connection.
interface SignalEvent {
  userIds?: string[];
  name: string;
  payload?: unknown;
}

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);

  constructor(@Inject(MESSAGING_CLIENT) private readonly messaging: ClientProxy) {}

  // Sends the signal `name` with what it carries to the apps of the Users named. Call it once what the signal announces
  // is stored. The answer does not wait for it: a lost signal only makes a list update late, since the app fetches it
  // again when it connects.
  send(to: SignalRecipients, name: string, payload?: unknown): void {
    if (to !== 'everyone' && to.length === 0) {
      return;
    }
    const event: SignalEvent = to === 'everyone' ? { name, payload } : { userIds: [...to], name, payload };
    this.messaging.emit('signal', event).subscribe({
      error: (error: unknown) => {
        this.logger.warn(`The signal ${name} was not sent: ${String(error)}`);
      },
    });
  }
}
