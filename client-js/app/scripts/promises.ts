import {obligate} from './obligation';

/**
 * Return a promise that will fire after the given delay.
 */
export function sleep(delayMillis: number): Promise<void> {
  var {obligation, promise} = obligate<void>();
  setTimeout(() => obligation.resolve(), delayMillis);
  return promise;
}

/**
 * Return a promise that will never fire.
 */
export function never(): Promise<void> {
  return new Promise<void>((resolve, reject) => {});
}
