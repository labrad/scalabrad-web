# scalabrad-web

## A web interface for labrad

This project aims to implement a web-based graphical interface to labrad.
The web server is written in scala (http://scala-lang.org) and built with sbt (http://scala-sbt.org).
To run the server you'll need to install sbt, then from the repository root run

```
$ sbt client/compile server/run
```

After downloading a bunch of packages (these are cached locally, so this will only be slow the first time),
you'll have a server running on `localhost:9000`. It will try to connect to a labrad manager running on
the same machine, so you should start up a labrad manager if you want to see anything interesting.

The `client/compile` step builds the client javascript code using GWT (http://gwtproject.org). However,
we are replacing this with a client built using typescript (http://www.typescriptlang.org/) with a build
system based on node.js. This new client lives in the `client-js/` folder.

To build the new client, first make sure you have `node.js` installed (https://nodejs.org/), which includes
the node package manager `npm`. Then, from inside the `client-js` directory you can install the necessary
global and project-level dependencies:

```
$ npm install -g bower typescript-compiler tsd webpack
$ npm install
$ bower install
```

Now, you should be able to run the webpack server to compile and launch the app:

```
$ gulp serve
```

This will start a web server running on `localhost:3000` that will serve the static files for the new client.
The client code running in the browser actually makes a websocket connection to the scala server we started
previously on port 9000, and uses JSON-RCP (http://www.jsonrpc.org/) over this websocket to communicate with
the backend server. This arrangement allows us to cleanly separate the javascript code and web interface from
the API implementation on the server.

### Some notes about code organization

```
client-js/   # the new javascript client code; alpha, not yet complete; built with node.js et al.
  
client/      # the old GWT-based client code; deprecated
jsonrpc/     # scala support code for the server-side JSON-RPC implementation
project/     # sbt project definition stuff (see the sbt docs for info about sbt project structure)
server/      # scala API server code; uses scalabrad to actually talk to labrad
  src/main/resources/routes       # defines mapping from URLs to scala functions that handle them
  src/main/scala/                 # server code is in here
    org/labrad/browser/
      RegistryController.scala    # the RegistryApi class is an example of exposing methods
                                  # to be callable via JSON-RPC
      WebsocketController.scala   # handles the actual request to open a websocket and sets up server-side state
shared/      # code shared between server and GWT client; will go away when GWT client does
build.sbt    # sbt build definition
```
