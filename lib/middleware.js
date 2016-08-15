/**
  Resource Middleware
  @description main definition of middleware
  @exports @default {function} remoteResourceMiddleware

  @TODO there's a whole lot of repeating myself for handling hook types
    (i.e., dispatch if primitive or object, call if fn, resolve if promise)
    maybe that logic can be pulled out somewhere?
**/

require('core-js/library/fn/object/assign');
import RemoteResource from './RemoteResource';
import callRemoteResource from './remoteCall';
import { CallProcessingError } from './errors';
import {
  buildHeaders, parseBody, makeStatusActions, makeRemoteCallHooks
} from './requestBuilders';

/**
  @name remoteResourceMiddleware
  @desc provides a function that can be used to configure the middleware's
    behavior, returning valid Redux middleware
  @param {object} conf
  @param {object} conf.injectedHeaders headers to be injected on every outgoing req
  @param {object} conf.statusActions HTTP Status codes w/ corresponding types
    or functions that will be emitted when the status code is received
  @returns {function} ReduxMiddleware
**/
export default function remoteResourceMiddleware(_conf) {
  const conf = Object.assign({
    injectedHeaders: {},
    statusActions: {}
  }, _conf || {});

  // TODO: this whole function is a mess, clean it up
  return store => next => action => {
    // if we don't find our symbol don't even bother
    if (action.hasOwnProperty && !action.hasOwnProperty(RemoteResource))
      return next(action);

    const defaultFailure = error => next({
      type: '@@REMOTE_RESOURCE_ERROR', error
    });

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

    callOpts.lifecycle = Object.assign({
      request: () => null,
      success: () => null,
      failure: defaultFailure
    }, action[RemoteResource].lifecycle || {});

    function reportError(error) {
      const failAction = callOpts.lifecycle.failure;

      if (typeof failAction === 'function') failAction(error, next);
      else if (typeof failAction === 'object')
        next(Object.assign({}, failAction, { error }));
      else next({ type: failAction, error });
    }

    // ensure we have the required keys
    if (!callOpts.uri) return reportError(new CallProcessingError(
      'Must include URI', 'argValidation'
    ));

    const requestBuilders = [
      buildHeaders(store.getState(), callOpts, conf.injectedHeaders),
      parseBody(store.getState(), callOpts.body),
      makeStatusActions(conf.statusActions, next),
      makeRemoteCallHooks(callOpts.lifecycle, next)
    ];

    return Promise.all(requestBuilders)
    .then(([ headers, body, statusActions, hooks ]) => {
      const request = {
        headers, body,
        uri: callOpts.uri,
        method: callOpts.method.toUpperCase(),
        requestOpts: callOpts.requestOpts
      };

      // allow users to supply a custom fetch object
      const custFetch = callOpts._fetch || conf._fetch || null;

      return callRemoteResource(request, statusActions, hooks, custFetch);
    })
    .catch(reportError);
  };
}
