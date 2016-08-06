/**
  Errors
  @description defines custom errors used for the middleware
  @exports {class} APIError
**/

/**
  @class APIError
  @desc given when API response gives error outside of 200 range
  @param {number} status HTTP Status given in response
  @param {string} statusText message given along with the error
  @param {object} response
**/
export class APIError extends Error {
  constructor(status, statusText, response) {
    super();
    this.name = 'ReduxRemoteResAPIError';
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.message = `${status} - ${statusText}`;
  }
}
