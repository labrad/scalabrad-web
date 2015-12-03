/**
 * Obligation is the input side complement of Promise; while Promise provides a
 * way to create chains of asynchronous callbacks, Obligation is the input that
 * lets us send a value or error in to the beginning of the callback chain.
 *
 * The name is meant to evoke a scenario in which Alice gives to Bob a promise
 * that she will deliver a value. We then say that Alice has an obligation to
 * either deliver a value as promised or else explain why she failed to do so.
 * An Obligation contains two methods `resolve` and `reject` which correspond
 * respectively to these two cases, delivering a value or failing with an error.
 *
 * In the standard ES6 Promise API, resolve and reject functions are only
 * accessible as arguments passed in to the executor function which we pass to
 * the Promise constructor. However, in many cases we'd like to call these
 * functions from outside the constructor; Obligation makes this possible. This
 * is especially useful in situations where we need to connect callback-based
 * code with Promise-based code.
 *
 * Compare the scala.concurrent library, which properly separates the input and
 * output sides of an asynchronous callback chain into two classes:
 * scala.concurrent.Promise is the input side (equivalent to Obligation here)
 * and scala.concurrent.Future is the output side (equivalent to Promise here).
 */
export interface Obligation<R> {
  resolve: (value?: R | Promise<R>) => void;
  reject: (error: any) => void
}

/**
 * Create an Obligation/Promise pair with the given result type.
 */
export function obligate<R>(): { obligation: Obligation<R>, promise: Promise<R> } {
  var obligation: Obligation<R>;
  var promise = new Promise<R>((resolve, reject) => {
    obligation = { resolve: resolve, reject: reject };
  });
  return { obligation: obligation, promise: promise };
}
