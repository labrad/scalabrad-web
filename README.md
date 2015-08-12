# scalabrad-web

## A web interface for labrad

This project aims to implement a web-based graphical interface to labrad.
The web server is written in scala (http://scala-lang.org) and built with sbt (http://scala-sbt.org).
To run the server you'll need to install sbt, then from the repository root run

```
$ sbt server/run
```

After downloading a bunch of packages (these are cached locally, so this will only be slow the first time),
you'll have a server running on `localhost:9000`. It will try to connect to a labrad manager running on
the same machine, so you should start up a labrad manager if you want to see anything interesting.
Note that the server uses the [play framework](https://www.playframework.com/) which
requires java 8, so you'll need to make sure you are using java 8 when you launch sbt
to run the server. (To check which java version you have, run `java -version`.)

The client code is built using typescript (http://www.typescriptlang.org/) with a build
system based on node.js and lives in the `client-js/` folder.

To build the client, first make sure you have `node.js` installed (https://nodejs.org/), which includes
the node package manager `npm`. Then, from inside the `client-js` directory you can install the necessary
global and project-level dependencies:

```
$ npm install -g gulp typescript jspm bower
$ npm install
$ jspm install
$ bower install
```

Now, you should be able to run the gulp build to compile and launch the app:

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
client-js/   # javascript client code; built with node.js et al.
jsonrpc/     # scala support code for the server-side JSON-RPC implementation
project/     # sbt project definition stuff (see the sbt docs for info about sbt
             # project structure)
server/      # scala API server code; uses scalabrad to actually talk to labrad
  src/main/resources/routes       # defines mapping from URLs to scala functions
                                  # that handle them
  src/main/scala/                 # server code is in here
    org/labrad/browser/
      ApiBackend.scala         # defines "routes" that map JSON-RPC calls to scala
      BrowserController.scala  # handles the actual request to open a websocket
      *Api.scala               # classes with api methods callable from the client
build.sbt    # sbt build definition
```

## Contributing

For instructions on how to contribute to scalabrad-web, see [contributing.md](https://github.com/labrad/labrad/blob/master/contributing.md).

Client-side code should follow the Google [javascript style guide](http://google.github.io/styleguide/javascriptguide.xml).
New code should include [JSDoc](http://usejsdoc.org/) comments for documentation.
Note that some information often included in JSDoc comments, such as parameter types, is redundant in typescript code which already has type annotations, so can be omitted.
Another useful reference for coding style is Microsoft's [coding guidelines](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines) for typescript code.

