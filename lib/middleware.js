/**
  Resource Middleware
  @description main definition of middleware
  @exports @default {function} remoteResourceMiddleware
**/

/* eslint no-unused-vars:0 */
import fetch from 'isomorphic-fetch';
import RemoteResource from './RemoteResource';
import * as utils from './utils';

/**
  @name remoteResourceMiddleware
  @desc provides a function that can be used to configure the middleware's
    behavior, returning valid Redux middleware
  @param {object} conf
  @param {object} injectedHeaders headers to be injected on every outgoing req
  @param {object} statusActions HTTP Status codes w/ corresponding types
    or functions that will be emitted when the status code is received
  @returns {function} ReduxMiddleware
**/
export default function remoteResourceMiddleware(conf) {
  return store => next => action => {
    // if we don't find our symbol don't even bother
    if (action.hasOwnProperty && !action.hasOwnProperty(RemoteResource))
      return next(action);

    const callOpts = action[RemoteResource];
    store.dispatch(action);
  };
}

/**
  @private
  @name cacheLookup
  @desc consults the given state cache mapping to see if we already have a value
    note that this will *not* run when using actionable HTTP methods like POST
  @param {string} method HTTP verb, used to determine if we should cache
  @param {function} cacheMapping
  @param {boolean} nocache
  @param {function} emitSuccessOnCacheHit
  @returns {Promise<boolean>} result

  @TODO allow `cacheMapping` to return a value that will be supplied to the
    success event if `emitSuccessOnCacheHit` is true after the whole thing
    short circuits
**/
function cacheLookup(state, { method, cacheMapping, nocache }) {
  if (!utils.isCacheableRequest(method) || !cacheMapping || nocache)
    return Promise.resolve(false);

  return Promise.resolve(cacheMapping(state));
}
