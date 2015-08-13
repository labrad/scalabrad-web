import {Lifetime} from './lifetime';

/**
 * Manages a collection of callbacks that accept messages of type A.
 *
 * When the Observable's call() method is invoked with a value of type A,
 * we schedule all the registered callbacks to be invoked asynchronously.
 * Observable holds a strong reference to added callbacks which prevents them
 * from being garbage collected until they have been removed. It is the caller's
 * responsibility to ensure that callbacks are removed when appropriate to avoid
 * memory leaks.
 */
export class Observable<A> {
  private callbacks = new Set<(A) => void>();

  /**
   * Register a callback to be invoked whenever this Observable is called.
   *
   * If the optional lifetime parameter is provided, we automatically schedule
   * the given callback to be removed when the lifetime is closed. Otherwise,
   * the caller is responsible for removing the callback.
   */
  add(callback: (A) => void, lifetime?: Lifetime): (A) => void {
    this.callbacks.add(callback);
    if (lifetime) {
      lifetime.defer((() => this.remove(callback)).bind(this));
    }
    return callback;
  }

  /**
   * Unregister the given callback.
   */
  remove(callback: (A) => void): void {
    this.callbacks.delete(callback);
  }

  call(value: A): void {
    for (let callback of this.callbacks) {
      window.setTimeout(() => callback(value), 0);
    }
  }
}
