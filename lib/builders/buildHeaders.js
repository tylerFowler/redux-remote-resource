import { isPromise } from '../utils';
import { CallProcessingError } from '../errors';

export const STEP_NAME = '#buildHeaders';

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
export default function buildHeaders(state, { headers, body }, injectedHeaders) {
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
        return Promise.reject(new CallProcessingError(msg, STEP_NAME, error));
      }
    else if (isPromise(headerVal))
      return headerVal.then(v => ({ key: header, value: v }));
    // if you're not a promise but still an object we don't want you
    else if (typeof headerVal === 'object')
      return Promise.reject(
        new CallProcessingError(`Object given for header ${header}`, STEP_NAME)
      );
    // I guess it's just a plain value
    else return { key: header, value: headerVal };
  });

  return Promise.all(ps).then(p => p
    .filter(pair => pair.value !== false)
    .reduce((acc, pair) => { acc[pair.key] = pair.value; return acc; }, {})
  );
}
