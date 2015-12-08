import {Agent} from './hello-world';
import {Observable} from '../app/scripts/observable';
import {Lifetime} from '../app/scripts/lifetime';

/*
* Example test
*/
describe("Hello world", function() {
  var agent;

  beforeEach(function() {
    agent = new Agent();
  });

  it("says hello", function() {
    expect(agent.helloWorld()).toEqual("Hello world!");
  });
});

/*
* Test to create new observable and add callback
* This is mostly to see if the plumbing for the
* tests interfaces with the scripts in /app
*/

describe("observable test", function() {
  var observable: Observable<any>;

  it("calls added callbacks asynchronously", function(done) {
    var observable = new Observable<string>();
    observable.add((msg) => {
      expect(msg).toEqual("foo");
      done();
    });
    observable.call("foo");
  });

});

