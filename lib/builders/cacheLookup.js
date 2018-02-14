import { isCacheableRequest } from '../utils';
import { CallProcessingError } from '../errors';

export const STEP_NAME = '#cacheLookup';

/**
  @private
  @name cacheLookup
  @desc consults the given state cache mapping to see if we already have a value
    note that this will *not* run when using actionable HTTP methods like POST
  @param {string} method HTTP verb, used to determine if we should cache
  @param {function} cacheMapping
  @param {boolean} nocache
  @returns {Promise<value|boolean>} result will be the value from the cache
    mapping, or simply false if the cache couldn't/shouldn't be used
**/
export default function cacheLookup(state, { method, cacheMapping, nocache }) {
  if (!isCacheableRequest(method) || !cacheMapping || nocache)
    return Promise.resolve(false);

  try {
    return Promise.resolve(cacheMapping(state));
  } catch (error) {
    const msg = 'Error thrown while evaluating cache mapping';
    return Promise.reject(new CallProcessingError(msg, STEP_NAME, error));
  }
}
