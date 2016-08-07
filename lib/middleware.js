/**
  Resource Middleware
  @description main definition of middleware
  @exports @default {function} remoteResourceMiddleware
  @exports {function} cacheLookup
  @exports {function} buildHeaders
  @exports {function} parseBody
**/

require('core-js/library/fn/object/assign');
import RemoteResource from './RemoteResource';
import { CallProcessingError } from './errors';
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
export default function remoteResourceMiddleware(_conf) {
  const conf = Object.assign({
    injectedHeaders: {},
    statusActions: {}
  }, _conf || {});

  return store => next => action => {
    // if we don't find our symbol don't even bother
    if (action.hasOwnProperty && !action.hasOwnProperty(RemoteResource))
      return next(action);

    // ensure we have the required keys
    if (
      !action[RemoteResource].uri ||
      !action[RemoteResource].lifecycle ||
      !action[RemoteResource].lifecycle.request ||
      !action[RemoteResource].lifecycle.failure ||
      !action[RemoteResource].lifecycle.success
    ) return next(action); // TODO: we'll want to dispatch a custom error here

    const callOpts = Object.assign({
      method: 'GET',
      headers: {},
      body: null,
      cacheMapping: () => false,
      nocache: false,
      bypassStatusActions: false,
      emitSuccessOnCacheHit: false,
      requestOpts: {}
    }, action[RemoteResource]);

    const requestBuilders = [
      buildHeaders(store.getState(), callOpts, conf.injectedHeaders),
      parseBody(store.getState(), callOpts.body)
    ];

    return Promise.all(requestBuilders)
    .then(([ headers, body ]) => {
      const { dispatch } = store;
      const request = {
        headers, body,
        uri: callOpts.uri,
        method: callOpts.method.toUpperCase(),
        requestOpts: callOpts.requestOpts
      };

      const statusActions = Object.keys(conf.statusActions).map(code => {
        const fn = conf.statusActions[code];
        return { code, callback: res => fn(dispatch, res) };
      });

      const redirectHook = (hookVal, cb) => {
        if (typeof hookVal === 'function') return cb(hookVal);
        else if (utils.isPromise(hookVal)) return hookVal
          .then(v => redirectHook(v, cb));
        return () => store.dispatch({ type: hookVal });
      };

      const hooks = {
        onBeforeCall: redirectHook(
          callOpts.lifecycle.request, fn => () => fn(dispatch)
        ),
        onCallSuccess: redirectHook(
          callOpts.lifecycle.success, fn => (data, res) =>
            fn(data, dispatch, res)
        ),
        onCallFailure: redirectHook(
          callOpts.lifecycle.failure, fn => (status, res, data) => {
            const msg = data && data.error
              ? data.error
              : res.statusText;
            fn(new APIError(status, msg, res), dispatch, data, res);
          }
        )
      };

      return callRemoteResource(request, statusActions, hooks);
    })

    // TODO: obviously this is temporary,
    // dispatch the error lifecycle w/ the error
    .catch(error => { throw error; });
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
export function cacheLookup(state, { method, cacheMapping, nocache }) {
  const stepName = '#cacheLookup';
  if (!utils.isCacheableRequest(method) || !cacheMapping || nocache)
    return Promise.resolve(false);

  try {
    return Promise.resolve(cacheMapping(state));
  } catch (error) {
    const msg = 'Error thrown while evaluating cache mapping';
    return Promise.reject(new CallProcessingError(msg, stepName, error));
  }
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
export function buildHeaders(state, { headers, body }, injectedHeaders) {
  const stepName = '#buildHeaders';
  let headerMap = Object.assign({}, injectedHeaders || {}, headers);

  if (
    body &&
    typeof body === 'object' &&
    !headerMap.hasOwnProperty('Content-Type')
  ) headerMap['Content-Type'] = 'application/json';

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

  return Promise.all(ps).then(p => p
    .filter(pair => pair.value !== false)
    .reduce((acc, pair) => { acc[pair.key] = pair.value; return acc; }, {})
  );
}

/**
  @private
  @name parseBody
  @desc detects if the request body is an object, if so will attempt to parse
    it as JSON, otherwise just returning it; if body is a function it will be
    called with the state passed in - supports promises
  @param {object} state
  @param {any} body
  @returns {Promise<string>} parsedBody
**/
export function parseBody(state, body) {
  const stepName = '#parseBody';
  if (utils.isPromise(body))
    return body.then(realBody => parseBody(state, realBody));
  else if (typeof body === 'object')
    try {
      return Promise.resolve(JSON.stringify(body));
    } catch (error) {
      return Promise.reject(new CallProcessingError(
        'Error parsing body', stepName, error
      ));
    }
  else if (typeof body === 'function')
    try {
      return Promise.resolve(body(state));
    } catch (error) {
      return Promise.reject(new CallProcessingError(
        'Error occurred while evaluating body function', stepName, error
      ));
    }
  else return Promise.resolve(body);
}
