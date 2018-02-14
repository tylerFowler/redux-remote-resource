import { CallProcessingError } from '../errors';

export const STEP_NAME = '#buildQuery';

/**
  @private
  @name buildQuery
  @desc builds a query string that can be attached to a URI from
    and object, parameter objects must be flat and if a value is
    an object it will be converted a JSON string
  @param {object} params the parameters to be converted to a query string
  @returns {Promise<String|CallProcessingError>}
**/
export default function buildQuery(params = {}) {
  if (typeof params !== 'object' || Array.isArray(params))
    return Promise.reject(
      new CallProcessingError('Query params must be object', STEP_NAME)
    );

  const queryString = Object.keys(params)
    .map(key => {
      let value = params[key];
      if (typeof value === 'object')
        value = JSON.stringify(value);

      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }).join('&');

  return Promise.resolve(`?${queryString}`);
}
