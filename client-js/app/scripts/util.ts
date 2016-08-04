export function encodeQueryString(params: Object): string {
  const paramStrings = [];
  for (let key in params) {
    if (params.hasOwnProperty(key)) {
      const keyStr = encodeURIComponent(key),
            valStr = encodeURIComponent(params[key]);
      paramStrings.push(`${keyStr}=${valStr}`);
    }
  }
  return paramStrings.join('&');
}

export function decodeQueryString(queryString: string): Object {
  var params = {},
      regex = /([^&=]+)=([^&]*)/g,
      m;
  while (m = regex.exec(queryString)) {
    params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
  }
  return params;
}
