import { APIError, CallProcessingError } from '../errors';
import { isPromise } from '../utils';

export const STEP_NAME = '#makeRemoteCallHooks';

/**
  @private
  @name makeRemoteCallHooks
  @desc parses the given lifecycle hooks, providing redirections for the
    remote call API and giving the correct args for each hook
  @param {object} lifecycleHooks contains the orginal user lifecycle hooks
  @param {any} lifecycleHooks.request
  @param {any} lifecycleHooks.success
  @param {any} lifecycleHooks.failure
  @param {function} dispatch
  @returns {Promise<object>} remoteCallHooks
**/
export default function makeRemoteCallHooks(lifecycleHooks, dispatch) {
  // ensure that for each hook we can call a callback on fn values so
  // that we can provide the set of arguments for that hook
  const redirectHook = (hookVal, cb) => {
    if (!hookVal)
      // if hook is left out just make the call hook a noop
      return Promise.resolve(() => {});
    else if (typeof hookVal === 'function')
      return Promise.resolve(cb(hookVal));
    else if (isPromise(hookVal))
      return hookVal.then(v => redirectHook(v, cb));
    else if (typeof hookVal === 'object')
      return Promise.resolve(() => dispatch(hookVal));
    return Promise.resolve(() => dispatch({ type: hookVal }));
  };

  const reqCb = fn => () => fn(dispatch);
  const sucCb = fn => (data, res) => fn(data, dispatch, res);
  const errCb = fn => (status, data, res) => {
    const msg = data.error || data.err || res.statusText;
    fn(new APIError(status, msg, res), dispatch, data, res);
  };

  return Promise.all([
    redirectHook(lifecycleHooks.request, reqCb),
    redirectHook(lifecycleHooks.success, sucCb),
    redirectHook(lifecycleHooks.failure, errCb)
  ]).then(([ onBeforeCall, onCallSuccess, onCallFailure ]) =>
    ({ onBeforeCall, onCallSuccess, onCallFailure })
  ).catch(error => {
    const msg = 'Error thrown while processing lifecycle hooks';
    Promise.reject(new CallProcessingError(msg, STEP_NAME, error));
  });
}
