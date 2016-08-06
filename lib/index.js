/**
  Redux Remote Resource Manifest
  @exports @default {function} remoteResourceMiddleware
  @exports {symbol} RemoteResource
  @exports {class} APIError
**/

import remoteResourceMiddleware from './middleware';
export default remoteResourceMiddleware;

export { default as RemoteResource } from './RemoteResource';
export { APIError } from './errors';
