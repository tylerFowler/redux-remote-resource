/**
  RemoteCall
  @description function that makes the remote call using the fetch polyfill,
    running a series of provided lifecycle hooks
  @exports @default {function} callRemoteResource
**/

import isomorphicFetch from 'isomorphic-fetch';

/**
  @private
  @name callRemoteResource
  @desc makes a call using the fetch API w/ the given request data & hooks
  @param {object} request
  @param {string} request.uri
  @param {string} request.method
  @param {object} request.headers
  @param {string} request.body
  @param {object} request.requestOps arbitrary options passed to fetch
  @param {obejct} statusActions obj keyed by codes w/ fn values
  @param {object} hooks the lifecycle hooks evaluated at various times
  @param {function} hooks.onBeforeCall
  @param {function} hooks.onCallSuccess(data, response)
  @param {function} hooks.onCallFailure(statusCode, data, response)
  @param {function|null} userFetch a custom fetch implementation to use
  @returns {Promise<Response|Error>}
**/
export default function callRemoteResource(
  request, statusActions, hooks, userFetch
) {
  // order of fetch priority:
  // user supplied fetch -> global fetch -> isomorphic-fetch
  const callFetch = userFetch || fetch || isomorphicFetch;
  const { uri, method, headers, body, requestOpts } = request;
  const fetchReq = Object.assign({ method, headers, body }, requestOpts);

  hooks.onBeforeCall();

  // NOTE: this expects to be caught in the surrounding block
  return callFetch(uri, fetchReq)
    .then(response => {
      if (statusActions[response.status]) {
        statusActions[response.status]();
        return [];
      }

      // extract the data, catching JSON parsing errors if it's empty
      return Promise.all([
        response, response.json().catch(() => Promise.resolve({}))
      ]);
    }).then(([ response, data ]) => {
      if (!response) // we've been handled by a status action
        return;

      if (!response.ok)
        hooks.onCallFailure(response.status, data || {}, response);
      else
        hooks.onCallSuccess(data || {}, response);
    });
}
