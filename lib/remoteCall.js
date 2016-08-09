/**
  RemoteCall
  @description function that makes the remote call using the fetch polyfill,
    running a series of provided lifecycle hooks
  @exports @default {function} callRemoteResource
**/

/* eslint no-unused-vars:0 */
// TODO: should probably use a global fetch instance if we can
import fetch from 'isomorphic-fetch';

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
  @param {array} statusActions an array of objects w/ code & callback keys
  @param {object} hooks the lifecycle hooks evaluated at various times
  @param {function} hooks.onBeforeCall
  @param {function} hooks.onCallSuccess(data, response)
  @param {function} hooks.onCallFailure(statusCode, data, response)
  @returns {Promise<Response|Error>}
**/
export default function callRemoteResource(request, statusActions, hooks) {
  const { uri, method, headers, body, requestOpts } = request;
  const fetchReq = Object.assign({ method, headers, body }, requestOpts);

  hooks.onBeforeCall();

  // NOTE: this expects to be caught in the surrounding block
  return fetch(uri, fetchReq);
}
