import {Obligation, obligate} from './obligation';

/**
 * An asynchronous queue of items of some type. Taking from the queue returns
 * a Promise that will fire when an item is ready (this Promise may already
 * be resolved if there were already items in the queue).
 */
export class AsyncQueue<A> {
  private items: Array<A> = [];
  private waiters: Array<Obligation<A>> = [];

  /**
   * Add an item to the queue.
   */
  offer(a: A): void {
    if (this.waiters.length > 0) {
      this.waiters.shift().resolve(a);
    } else {
      this.items.push(a);
    }
  }

  /**
   * Take an item from the queue, returning a Promise that will fire when an
   * item is available.
   */
  async take(): Promise<A> {
    if (this.items.length > 0) {
      return this.items.shift();
    } else {
      var { obligation, promise } = obligate<A>();
      this.waiters.push(obligation);
      return promise;
    }
  }

  /**
   * Close the queue. Any outstanding Promises will be rejected with an error
   * containing the given reason.
   */
  close(reason: string = 'queue closed'): void {
    while (this.waiters.length > 0) {
      this.waiters.shift().reject(new Error(reason));
    }
  }
}
