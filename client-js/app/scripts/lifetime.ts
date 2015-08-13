/**
 * A container for cleanup operations to be executed at a later time.
 *
 * You can think of a Lifetime as a way to emulate C++ destructors. We create
 * a Lifetime and then call defer, passing in cleanup functions that we want
 * to be run at the end of that lifetime. When the lifetime's close() method is
 * called, all those cleanup callbacks will be run, in reverse order from how
 * they were added.
 */
export class Lifetime {
  private closed = false;
  private callbacks = new Array<() => void>();

  /**
   * Schedule the given function to be run when this Lifetime is closed.
   *
   * If the lifetime is already closed, this raises an error.
   */
  defer(callback: () => void) {
    if (this.closed) throw new Error('lifetime already closed');
    this.callbacks.unshift(callback);
    // unshift puts the callback at the front of the list, since we want
    // to run callbacks in LIFO order.
  }

  /**
   * Close this lifetime, executing all deferred callbacks.
   *
   * If the lifetime is already closed, this raises an error.
   */
  close() {
    if (this.closed) throw new Error('lifetime already closed');
    for (let callback of this.callbacks) {
      callback();
    }
  }
}
