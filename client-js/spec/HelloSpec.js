describe("Hello world", function() {
  var Agent = require('../lib/helloWorld');
  var agent;

  beforeEach(function() {
    agent = new Agent();
  });

  it("says hello", function() {
    expect(agent.helloWorld()).toEqual("Hello world!");
  });
});