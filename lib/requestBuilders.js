/**
  Request Builder Pipeline Functions
  @description a collection of functions intended to be ran in parallel in order
    to create the parts to a request from the action data & global config
  @exports {function} cacheLookup
  @exports {function} buildHeaders
  @exports {function} parseBody
  @exports {function} makeStatusActions
  @exports {function} makeRemoteCallHooks

  @todo there's a whole lot of repeating myself for handling hook types
    (i.e., dispatch if primitive or object, call if fn, resolve if promise)
    maybe that logic can be pulled out somewhere?
**/

import { APIError, CallProcessingError } from './errors';
import { isCacheableRequest, isPromise } from './utils';

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
  if (!isCacheableRequest(method) || !cacheMapping || nocache)
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
    else if (isPromise(headerVal))
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
  if (!body) return Promise.resolve(null);
  else if (isPromise(body))
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

/**
  @private
  @name makeStatusActions
  @desc parses the status action configuration into actionable functions
  @param {object} ogActions original status action configuration, keys
    are codes & values are a mix of values, functions, promises, or objects
  @param {function} dispatch
  @returns {Promise<object>} statusActions where keys are codes & values
    are callbacks
**/
export function makeStatusActions(ogActions, dispatch) {
  const makeCallbackFromValue = val => {
    // functions are called w/ the response object
    if (typeof val === 'function')
      return Promise.resolve(res => val(dispatch, res));
    else if (isPromise(val))
      return val.then(newVal => makeCallbackFromValue(newVal));
    else if (typeof val === 'object')
      return Promise.resolve(() => dispatch(val));
    return Promise.resolve(() => dispatch({ type: val }));
  };

  let ps = Object.keys(ogActions)
  .map(code => makeCallbackFromValue(ogActions[code])
    .then(callback => ({ code, callback }))
  );

  return Promise.all(ps).then(entries => entries
    .reduce((acc, entry) => {
      acc[entry.code] = entry.callback;
      return acc;
    }, {})
  );
}

/**
  @private
  @name makeRemoteCallHooks
  @desc parses the given lifecycle hooks, providing redirections for the
    remote call API and giving the correct args for each hook
  @param {object} lifecycleHooks contains the orginal user lifecycle hooks
  @param {any} lifecycleHooks.request
  @param {any} lifecycleHooks.success
  @param {any} lifecycleHooks.failure
  @param {function} dispatch
  @returns {Promise<object>} remoteCallHooks
**/
export function makeRemoteCallHooks(lifecycleHooks, dispatch) {
  const stepName = '#makeRemoteCallHooks';

  // ensure that for each hook we can call a callback on fn values so
  // that we can provide the set of arguments for that hook
  const redirectHook = (hookVal, cb) => {
    if (!hookVal)
      // if hook is left out just make the call hook a noop
      return Promise.resolve(() => {});
    else if (typeof hookVal === 'function')
      return Promise.resolve(cb(hookVal));
    else if (isPromise(hookVal))
      return hookVal.then(v => redirectHook(v, cb));
    else if (typeof hookVal === 'object')
      return Promise.resolve(() => dispatch(hookVal));
    return Promise.resolve(() => dispatch({ type: hookVal }));
  };

  const reqCb = fn => () => fn(dispatch);
  const sucCb = fn => (data, res) => fn(data, dispatch, res);
  const errCb = fn => (status, data, res) => {
    const msg = data.error || data.err || res.statusText;
    fn(new APIError(status, msg, res), dispatch, data, res);
  };

  return Promise.all([
    redirectHook(lifecycleHooks.request, reqCb),
    redirectHook(lifecycleHooks.success, sucCb),
    redirectHook(lifecycleHooks.failure, errCb)
  ]).then(([ onBeforeCall, onCallSuccess, onCallFailure ]) =>
    ({ onBeforeCall, onCallSuccess, onCallFailure })
  ).catch(error => {
    const msg = 'Error thrown while processing lifecycle hooks';
    Promise.reject(new CallProcessingError(msg, stepName, error));
  });
}
