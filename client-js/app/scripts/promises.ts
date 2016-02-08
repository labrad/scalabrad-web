import {obligate} from './obligation';

export function sleep(delayMillis: number): Promise<void> {
  var {obligation, promise} = obligate<void>();
  setTimeout(() => obligation.resolve(), delayMillis);
  return promise;
}
