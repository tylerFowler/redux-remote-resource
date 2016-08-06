/**
  Resource Middleware
  @description main definition of middleware
  @exports @default {function} remoteResourceMiddleware
**/

/* eslint no-unused-vars:0 */
require('core-js/library/fn/object/assign');
import fetch from 'isomorphic-fetch';
import RemoteResource from './RemoteResource';
import { APIError, CallProcessingError } from './errors';
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
  @TODO wrap cacheMapping in a try/catch & reject w/ the appropriate error
**/
function cacheLookup(state, { method, cacheMapping, nocache }) {
  if (!utils.isCacheableRequest(method) || !cacheMapping || nocache)
    return Promise.resolve(false);

  return Promise.resolve(cacheMapping(state));
}

/**
  @private
  @name buildHeaders
  @desc builds a flat header map by evaluating each k/v in the given headers
    object, optionally injecting any headers from the top level configuration,
    will evaluate promises & functions passing in the state.
    If a header val is a function that returns false the header will be skipped
    NOTE: headers given in the action *will* overwrite globally injected headers
  @param {object} state
  @param {object} headers flat map w/ a mix of values, functions, or promises
  @param {object|string} body used to determine if we'll be sending JSON
  @param {object} injectedHeaders optional
  @returns {Promise<object|CallProcessingError}
**/
function buildHeaders(state, { headers, body }, { injectedHeaders }) {
  const stepName = '#buildHeaders';
  const headerMap = Object.assign({}, injectedHeaders || {}, actionHeaders);

  let ps = Object.keys(headerMap).map(header => {
    const headerVal = headerMap[header];

    if (typeof headerVal === 'function')
      try {
        return { key: header, value: headerVal(state) };
      } catch (error) {
        const msg = `Error thrown when evaluating header function ${header}`;
        return Promise.reject(new CallProcessingError(msg, stepName, error));
      }
    else if (utils.isPromise(headerVal))
      return headerVal.then(v => ({ key: header, value: v }));
    // if you're not a promise but still an object we don't want you
    else if (typeof headerVal === 'object')
      return Promise.reject(
        new CallProcessingError(`Object given for header ${header}`, stepName)
      );
    // I guess it's just a plain value
    else return { key: header, value: headerVal };
  });

  return Promise.all(ps).then(p =>
    p.reduce((acc, pair) => { acc[pair.key] = pair.value; return acc; }, {})
  );
}
