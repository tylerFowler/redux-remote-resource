import { isPromise } from '../utils';
import { CallProcessingError } from '../errors';

export const STEP_NAME = '#parseBody';

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
export default function parseBody(state, body) {
  if (!body) return Promise.resolve(null);
  else if (isPromise(body))
    return body.then(realBody => parseBody(state, realBody));
  else if (typeof body === 'object')
    try {
      return Promise.resolve(JSON.stringify(body));
    } catch (error) {
      return Promise.reject(new CallProcessingError(
        'Error parsing body', STEP_NAME, error
      ));
    }
  else if (typeof body === 'function')
    try {
      return Promise.resolve(body(state));
    } catch (error) {
      return Promise.reject(new CallProcessingError(
        'Error occurred while evaluating body function', STEP_NAME, error
      ));
    }
  else return Promise.resolve(body);
}
