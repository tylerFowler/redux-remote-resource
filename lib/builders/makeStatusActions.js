import { isPromise } from '../utils';

export const STEP_NAME = '#makeStatusActions';

/**
  @private
  @name makeStatusActions
  @desc parses the status action configuration into actionable functions
  @param {object} ogActions original status action configuration, keys
    are codes & values are a mix of values, functions, promises, or objects
  @param {object} callOpts are the request call options
  @param {function} dispatch
  @returns {Promise<object>} statusActions where keys are codes & values
    are callbacks
**/
export default function makeStatusActions(ogActions, callOpts, dispatch) {
  if (callOpts.bypassStatusActions)
    return Promise.resolve({});

  const makeCallbackFromValue = val => {
    // functions are called w/ the response object
    if (typeof val === 'function')
      return Promise.resolve(res => val(dispatch, res));
    else if (isPromise(val))
      return val.then(newVal => makeCallbackFromValue(newVal));
    else if (typeof val === 'object')
      return Promise.resolve(() => dispatch(val));
    return Promise.resolve(() => dispatch({ type: val }));
  };

  let ps = Object.keys(ogActions)
    .map(code => makeCallbackFromValue(ogActions[code])
      .then(callback => ({ code, callback }))
    );

  return Promise.all(ps).then(entries => entries
    .reduce((acc, entry) => {
      acc[entry.code] = entry.callback;
      return acc;
    }, {})
  );
}
