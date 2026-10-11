import { EventEmitter } from 'node:events';
import { logger } from '../lib/logger';
import type { DomainEvent } from './domain-events';

type Listener = (event: DomainEvent) => void;

const CHANNEL = 'domain-event';

class DomainEventBus {
  private readonly emitter = new EventEmitter();

  /** Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.emitter.on(CHANNEL, listener);
    return () => {
      this.emitter.off(CHANNEL, listener);
    };
  }

  /**
   * Call only AFTER the database transaction committed, so clients never hear
   * about changes that were rolled back. A failing listener must never break
   * the request that produced the event, so errors are logged and swallowed.
   */
  publish(events: readonly DomainEvent[]): void {
    for (const event of events) {
      try {
        this.emitter.emit(CHANNEL, event);
      } catch (error) {
        logger.error({ err: error, eventType: event.type }, 'Domain event listener failed');
      }
    }
  }
}

export const eventBus = new DomainEventBus();
