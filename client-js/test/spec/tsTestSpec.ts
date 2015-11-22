import {Agent} from '../test/helloWorld';
import {Observable} from '../app/scripts/observable';


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

describe("observable", function() {
  var observable;

  beforeEach(function() {
    observable = new Observable<any>();

  });

  function testFunc(message: string) {
    console.log("testFunc called");
    return message;
  }


  it("Add Callback", function() {
    console.log("In callback test");
    expect(observable.add(testFunc("something"))).toEqual("something");
  });
});

