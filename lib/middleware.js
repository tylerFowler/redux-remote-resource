/**
  Resource Middleware
  @description main definition of middleware
  @exports @default {function} remoteResourceMiddleware
**/

require('core-js/library/fn/object/assign');
import RemoteResource from './RemoteResource';
import callRemoteResource from './remoteCall';
import { CallProcessingError } from './errors';
import { isRemoteResourceAction } from './utils';

import cacheLookup from './builders/cacheLookup';
import buildHeaders from './builders/buildHeaders';
import buildQuery from './builders/buildQuery';
import makeStatusActions from './builders/makeStatusActions';
import parseBody from './builders/parseBody';
import makeRemoteCallHooks from './builders/makeRemoteCallHooks';

export const defaultCallOpts = {
  method: 'GET',
  headers: {},
  body: null,
  query: {},
  cacheMapping: () => false,
  nocache: false,
  bypassStatusActions: false,
  requestOpts: {}
};

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
    statusActions: {},
    requestOpts: {}
  }, _conf || {});

  // TODO: this whole function is a mess, clean it up
  return store => next => action => {
    // make sure we find our Symbol
    if (!isRemoteResourceAction(action)) return next(action);

    const defaultFailure = error => next({
      type: '@@REMOTE_RESOURCE_ERROR', error
    });

    const callOpts =
      Object.assign({}, defaultCallOpts, action[RemoteResource]);

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

    // TODO turn this into more of a pipeline-y kind of thing
    return Promise.all([
      cacheLookup(store.getState(), callOpts),
      buildHeaders(store.getState(), callOpts, conf.injectedHeaders),
      buildQuery(callOpts.query),
      parseBody(store.getState(), callOpts.body),
      makeStatusActions(conf.statusActions, callOpts, next),
      makeRemoteCallHooks(callOpts.lifecycle, next)
    ]).then(([
      cachedValue,
      headers,
      query,
      body,
      statusActions,
      hooks
    ]) => {
      // if we've found a cached value then immediately trigger success
      if (cachedValue) return hooks.onCallSuccess(cachedValue);

      let uri = callOpts.uri;
      if (query) {
        if (uri.endsWith('/'))
          uri = uri.substr(0, uri.length - 1);

        uri = uri + query;
      }

      const request = {
        headers, body, uri,
        method: callOpts.method.toUpperCase(),
        requestOpts: Object.assign({}, conf.requestOpts, callOpts.requestOpts)
      };

      // allow users to supply a custom fetch object
      const custFetch = callOpts._fetch || conf._fetch || null;

      return callRemoteResource(request, statusActions, hooks, custFetch);
    }).catch(reportError);
  };
}
