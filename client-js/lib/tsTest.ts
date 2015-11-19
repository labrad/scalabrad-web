import {Agent} from '../lib/helloWorld';
 //{Lifetime} from './lifetime';

describe("Hello world", function() {  
  var agent;

  beforeEach(function() {
    agent = new Agent();
  });

  it("says hello", function() {
    expect(agent.helloWorld()).toEqual("Hello world!");
  });
});