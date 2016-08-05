// Function for creating URLs of all the places in the application.

export class Places {
  fullPrefix: string;

  constructor(public prefix: string, public manager: string) {
    this.fullPrefix = this.prefix + (manager ? '/' + manager : '');
  }

  managerUrl(): string {
    return this.fullPrefix + '/';
  }

  nodesUrl(): string {
    return this.fullPrefix + '/nodes';
  }

  grapherUrl(path: string[], dir?: string): string {
    return this.fullPrefix + '/grapher/' + pathStr(path, dir);
  }

  datasetUrl(path: string[], dataset: string): string {
    return this.fullPrefix + '/dataset/' + pathStr(path, dataset);
  }

  registryUrl(path: string[], dir?: string): string {
    return this.fullPrefix + '/registry/' + pathStr(path, dir);
  }

  serverUrl(name: string): string {
    return this.fullPrefix + '/server/' + encodeURIComponent(name);
  }
}

// helper function to creating URL from a list of segments
function pathStr(path: string[], dir?: string): string {
  var url = '';
  path.forEach(function(seg) {
    url += encodeURIComponent(seg) + '/';
  });
  if (typeof dir !== 'undefined') {
    url += encodeURIComponent(dir) + '/';
  }
  return url;
}
