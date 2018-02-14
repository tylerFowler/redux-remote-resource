/**
  Utility Functions
  @description a collection of utility functions, aka junk drawer
  @exports {function} isRemoteResourceAction
  @exports {function} isCacheableRequest
  @exports {function} isPromise
**/

import RemoteResource from '../lib/RemoteResource';

/**
  @name isRemoteResourceAction
  @desc determines if an action should be processed by this middleware or not
    by checking that the action contains the RemoteResource Symbol
  @param {object} action
  @returns {boolean} isValid
**/
export function isRemoteResourceAction(action) {
  return (
    action && action.hasOwnProperty
    && (action.hasOwnProperty(RemoteResource) || !!action[RemoteResource])
  );
}

/**
  @name isCacheableRequest
  @desc determines if the request is cacheable based on HTTP verb used,
    will return false for actionable HTTP verbs like POST or DELETE
  @param {string} httpMethod
  @returns {boolean} result
**/
const uncacheableMethods = [ 'POST', 'PUT', 'PATCH', 'DELETE' ];
export function isCacheableRequest(httpMethod) {
  return !~uncacheableMethods.indexOf(httpMethod.toUpperCase());
}

/**
  @name isPromise
  @desc determines if a given value is a promise
  @param {any} potentialPromise
  @returns {boolean} result
**/
export function isPromise(potentialPromise) {
  return potentialPromise && typeof potentialPromise.then === 'function' &&
    typeof potentialPromise['catch'] === 'function'; // eslint-disable-line
}
