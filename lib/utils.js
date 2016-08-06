/**
  Utility Functions
  @description a collection of utility functions, aka junk drawer
  @exports {function} isCacheableRequest
**/

/**
  @name isCacheableRequest
  @desc determines if the request is cacheable based on HTTP verb used,
    will return false for actionable HTTP verbs like POST or DELETE
  @param {string} httpMethod
  @returns {boolean} result
**/
const uncacheableMethods = [ 'POST', 'PUT', 'DELETE' ];
export function isCacheableRequest(httpMethod) {
  return !!~uncacheableMethods.indexOf(httpMethod.toUpperCase());
}

/**
  @name isPromise
  @desc determines if a given value is a promise
  @param {any} potentialPromise
  @returns {boolean} result
**/
export function isPromise(potentialPromise) {
  return typeof potentialPromise.then === 'function' &&
    typeof potentialPromise['catch'] === 'function'; // eslint-disable-line
}
