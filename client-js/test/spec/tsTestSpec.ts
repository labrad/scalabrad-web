import {Agent} from '../test/helloWorld';
//import {Activity} from '../app/scripts/activity';

describe("Hello world", function() {
  var agent;
  //class RegistryActivity implements Activity {}
  

  beforeEach(function() {
    agent = new Agent();
  });

  it("says hello", function() {
    expect(agent.helloWorld()).toEqual("Hello world!");
  });
});