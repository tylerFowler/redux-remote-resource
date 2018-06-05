require('babel-register');

const test           = require('tape');
const thunk          = require('redux-thunk').default;
const middleware     = require('../lib/middleware').default;
const RemoteResource = require('../lib/RemoteResource').default;
const { createFetchMock, nest }        = require('./mock.helper');
const { applyMiddleware, createStore } = require('redux');

function makeMockStore(remoteResourceOpts = {}) {
  const fetchMock = createFetchMock();
  const middlewares = applyMiddleware(middleware(
    Object.assign({ _fetch: fetchMock.fetchFunc }, remoteResourceOpts)
  ), thunk);

  const actionLogReducer = (state = [], action) => state.concat(action);
  const store = createStore(actionLogReducer, middlewares);

  return { fetch: fetchMock, store };
}

// test action types
const REQUEST = 'REQUEST';
const REQUEST_SUCCESS = 'REQUEST_SUCCESS';
const REQUEST_FAILURE = 'REQUEST_FAILURE';

test.only('middleware integration', st => {
  st.test(nest('idempotent request'), t => {
    const { fetch, store } = makeMockStore();

    const respData = { test: 'data' };
    fetch.respondWith(200, respData);
    const reqHeaders = { 'Accept': 'application/json' };
    const action = {
      [RemoteResource]: {
        uri: 'localhost/someapi',
        headers: reqHeaders,
        lifecycle: {
          request: REQUEST,
          success(data, dispatch) {
            t.deepEquals(data, respData, 'returned correct parsed data');
            dispatch({ type: REQUEST_SUCCESS });
          },
          failure(error, dispatch) {
            t.error(error);
            dispatch({ type: REQUEST_FAILURE });
          }
        }
      }
    };

    store.dispatch(action)
      .then(() => {
        const actions = store.getState();
        t.ok(actions.length, 'state has actions');

        const actionWasDispatched =
          actionType => actions.some(({ type }) => type === actionType);

        t.ok(actionWasDispatched(REQUEST), 'request was dispatched');
        t.ok(actionWasDispatched(REQUEST_SUCCESS),
          'request success was dispatched');

        t.equals(fetch.method(), 'GET', 'fetched w/ method GET by default');
        t.deepEqual(fetch.headers(), reqHeaders,
          'fetch was called with correct headers');
      }).catch(t.fail);

    t.end();
  });

  st.test(nest('post request'), t => t.fail('not implemented'));
  st.test(nest('status actions'), t => t.fail('not implemented'));
  st.test(nest('idempotent request with cache'), t => t.fail('not implemented'));
});
