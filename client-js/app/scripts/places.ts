// Function for creating URLs of all the places in the application.

export function grapherUrl(path: Array<string>, dir?: string): string {
  return '/grapher/' + pathStr(path, dir);
}

export function datasetUrl(path: Array<string>, dataset: string): string {
  return '/dataset/' + pathStr(path, dataset);
}

export function registryUrl(path: Array<string>, dir?: string): string {
  return '/registry/' + pathStr(path, dir);
}

export function serverUrl(name: string): string {
  return '/server/' + encodeURIComponent(name);
}

// helper function to creating URL from a list of segments
function pathStr(path: Array<string>, dir?: string): string {
  var url = '';
  path.forEach(function(seg) {
    url += encodeURIComponent(seg) + '/';
  });
  if (typeof dir !== 'undefined') {
    url += encodeURIComponent(dir) + '/';
  }
  return url;
}
