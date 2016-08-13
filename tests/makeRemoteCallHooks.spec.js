require('babel-register');

const test = require('tape');
const { makeRemoteCallHooks } = require('../lib/middleware');

const failTest = t => error => { t.fail(error); t.end(); };

test('makeRemoteCallHooks', st => {
  st.test('\t-> plain hooks', t => {
    const hooks = { request: 'REQUEST' };
    const dispatch = act => act;
    return makeRemoteCallHooks(hooks, dispatch)
    .then(hs => {
      t.deepEqual(
        hs.onBeforeCall(), { type: hooks.request }, 'dispatches plain action'
      );
      t.end();
    }).catch(failTest(t));
  });

  st.test('\t-> object hooks', t => {
    const hooks = { request: { type: 'REQUEST' } };
    const dispatch = act => act;
    return makeRemoteCallHooks(hooks, dispatch)
    .then(hs => {
      t.deepEqual(
        hs.onBeforeCall(), hooks.request, 'dispatches objects verbatim'
      );
      t.end();
    }).catch(failTest(t));
  });

  st.test('\t-> missing hooks', t => {
    const hooks = {};
    const dispatch = () => {
      throw new Error('should not have called dispatch');
    };

    return makeRemoteCallHooks(hooks, dispatch)
    .then(hs => {
      try {
        hs.onBeforeCall();
        hs.onCallSuccess();
        hs.onCallFailure();
        t.pass('does not dispatch anything for ommitted hooks');
      } catch (error) { t.fail(error); }
      t.end();
    }).catch(failTest(t));
  });

  st.test('\t-> promise hooks', t => {
    const hooks = {
      request: Promise.resolve('REQUEST'),
      success: Promise.resolve().then(() => 'SUCCESS')
    };
    const dispatch = act => act;
    return makeRemoteCallHooks(hooks, dispatch)
    .then(hs => {
      t.deepEqual(
        hs.onBeforeCall(), { type: 'REQUEST' }, 'dispatches w/ resolved values'
      );

      t.deepEqual(
        hs.onCallSuccess(), { type: 'SUCCESS' }, 'recursively resolves promises'
      );

      t.end();
    }).catch(failTest(t));
  });

  st.test('\t-> function hooks', t => {
    t.plan(3);

    const hooks = {
      request: dispatch => t.ok(dispatch, 'request called w/ dispatch'),
      success: (data, dispatch, res) =>
        t.ok(data && dispatch && res, 'success called w/ data, dispatch, & res'),
      failure: (err, dispatch, data, res) =>
        t.ok(err && dispatch && res, 'failure called w/ err, dispatch, data, & res')
    };
    const dispatch = () => {};
    return makeRemoteCallHooks(hooks, dispatch)
    .then(hs => {
      hs.onBeforeCall(1);
      hs.onCallSuccess(1, 2, 3);
      hs.onCallFailure(1, 2, 3, 4);
    }).catch(failTest(t));
  });

  st.end();
});