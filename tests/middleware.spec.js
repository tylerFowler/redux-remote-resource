require('babel-register');

const test           = require('tape');
const thunk          = require('redux-thunk').default;
const middleware     = require('../lib/middleware').default;
const RemoteResource = require('../lib/RemoteResource').default;
const { createFetchMock, nest, failTest } = require('./mock.helper');
const { applyMiddleware, createStore }    = require('redux');

function makeMockStore(remoteResourceOpts = {}) {
  const fetchMock = createFetchMock();
  const middlewares = applyMiddleware(middleware(
    Object.assign({ _fetch: fetchMock.fetchFunc }, remoteResourceOpts)
  ), thunk);

  const actionLogReducer = (state = [], action) => state.concat(action);
  const store = createStore(actionLogReducer, middlewares);

  return { fetch: fetchMock, store };
}

const actionWasDispatched = (actionType, actions) =>
  actions.some(({ type }) => type === actionType);

// test action types
const REQUEST = 'REQUEST';
const REQUEST_SUCCESS = 'REQUEST_SUCCESS';
const REQUEST_FAILURE = 'REQUEST_FAILURE';

test('middleware integration', st => {
  st.test(nest('idempotent request'), t => {
    const { fetch, store } = makeMockStore();

    const respData = { test: 'data' };
    fetch.respondWith(200, respData);

    const reqHeaders = { 'Accept': 'application/json' };
    const reqUrl = 'localhost/someapi';
    const action = {
      [RemoteResource]: {
        uri: reqUrl,
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
        t.ok(actionWasDispatched(REQUEST, actions), 'request was dispatched');
        t.ok(actionWasDispatched(REQUEST_SUCCESS, actions),
          'request success was dispatched');

        t.equals(fetch.url(), reqUrl, 'fetch w/ correct url');
        t.equals(fetch.method().toLowerCase(), 'get',
          'fetched w/ method GET by default');
        t.deepEqual(fetch.headers(), reqHeaders,
          'fetch was called with correct headers');
        t.end();
      }).catch(failTest);
  });

  st.test(nest('post request w/ error'), t => {
    const { fetch, store } = makeMockStore();

    const responseStatus = 400;
    const responseBody = { error: 'Some validation error' };
    fetch.respondWith(responseStatus, responseBody);

    const reqBody = { test: 'data' };
    const action = {
      [RemoteResource]: {
        uri: 'localhost/someapi',
        headers: { 'Content-Type': 'application/json' },
        method: 'post',
        body: reqBody,
        lifecycle: {
          request: REQUEST,
          success(data, dispatch) {
            t.fail('success hook should not have been called');
            dispatch(REQUEST_SUCCESS);
          },
          failure(error, dispatch) {
            return Promise.resolve(dispatch({ type: REQUEST_FAILURE, error }));
          }
        }
      }
    };

    store.dispatch(action)
      .then(() => {
        const actions = store.getState();
        t.ok(actions.length, 'state has actions');
        t.ok(actionWasDispatched(REQUEST, actions), 'request was dispatched');
        t.ok(actionWasDispatched(REQUEST_FAILURE, actions),
          'request failure was dispatched');

        const failAction = actions.find(ac => ac.type === REQUEST_FAILURE);
        t.equals(failAction.error.statusText, responseBody.error,
          'extracts error from response');

        t.equals(fetch.method().toLowerCase(), 'post',
          'fetched w/ correct method');

        t.end();
      });
  });

  st.test(nest('post request'), t => t.fail('not implemented'));
  st.test(nest('status actions'), t => t.fail('not implemented'));
  st.test(nest('idempotent request with cache'), t => t.fail('not implemented'));
});
