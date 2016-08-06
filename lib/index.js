/**
  Redux Remote Resource Manifest
  @exports {symbol} RemoteResource
  @exports @default {function} remoteResourceMiddleware
**/

export { default as RemoteResource } from './RemoteResource';

import remoteResourceMiddleware from './middleware';
export default remoteResourceMiddleware;
