System.config({
  "baseURL": "/",
  "transpiler": "traceur",
  "paths": {
    "*": ".tmp/*.js",
    "github:*": "jspm_packages/github/*.js",
    "npm:*": "jspm_packages/npm/*.js"
  }
});

System.config({
  "map": {
    "d3": "github:mbostock/d3@3.5.17",
    "page": "npm:page@1.6.3",
    "polymer-ts": "npm:polymer-ts@0.1.26",
    "three": "github:mrdoob/three.js@r78",
    "traceur": "github:jmcriffey/bower-traceur@0.0.88",
    "traceur-runtime": "github:jmcriffey/bower-traceur-runtime@0.0.88",
    "whatwg-fetch": "npm:whatwg-fetch@1.0.0",
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.1"
    },
    "npm:page@1.6.3": {
      "path-to-regexp": "npm:path-to-regexp@1.0.3",
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:path-to-regexp@1.0.3": {
      "isarray": "npm:isarray@0.0.1"
    }
  }
});

