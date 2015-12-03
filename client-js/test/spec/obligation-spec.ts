import {Obligation, obligate} from '../app/scripts/obligation';

describe('Obligation', function() {

  it('resolves promise when resolve is called', (done) => {
    var { obligation, promise } = obligate<string>();
    promise.then((msg) => {
      expect(msg).toEqual('foo');
      done();
    });
    obligation.resolve('foo');
  });

  it('rejects promise when reject is called', (done) => {
    var { obligation, promise } = obligate<string>();
    promise.catch((err) => {
      expect(err.message).toEqual('bar');
      done();
    });
    obligation.reject(new Error('bar'));
  });

});

