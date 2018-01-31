/**
  Errors
  @description defines custom errors used for the middleware
  @exports {class} APIError
**/

/**
  @class APIError
  @desc given when API response gives error outside of 200 range
  @param {number} status HTTP Status given in response
  @param {string} data message given along with the error
  @param {object} response
**/
export class APIError extends Error {
  constructor(status, data, response) {
    super();
    this.name = 'APIError';
    this.status = status;
    this.statusText = data;
    this.data = data;
    this.response = response;
    this.message = `${status} - ${data}`;
  }
}

/**
  @class CallProcessingError
  @desc given when an error occurs while processing the remote call action
  @param {string} msg
  @param {string} processStep the part of the call process that threw the error
  @param {error} sourceError (optional)
**/
export class CallProcessingError extends Error {
  constructor(msg, processStep, sourceError) {
    super();
    this.name = 'CallProcessingError';
    this.processStep = processStep;
    this.sourceError = sourceError;
    this.message = sourceError
      ? `${msg}\nOriginal Error: ${sourceError}`
      : msg;
  }
}
