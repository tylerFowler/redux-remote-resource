redux-remote-resource
=====================
Flexible Redux middleware for making remote API calls

*Currently a work in progress, close to being in the initial useable state*

## Usage
This middleware works at two levels: with a top level global configuration, and with an action-by-action interface. This allows us to implement interceptors for common things like session expiration or global 404 Not Found pages.

### Configuration

#### At a glance:
```javascript
import { applyMidleware } from 'redux';
import remoteResourceMiddleware from 'redux-remote-resource';

// basic, no global configuration
const middlewares = applyMiddleware(remoteResourceMiddleware());

// with a global configuration
const middlewares = applyMiddleware(remoteResourceMiddleware({
  // automatically injected into *every* request made with the middleware,
  // but can be overridden on a call-by-call basis
  injectedHeaders: {
    'x-access-token': localStorage.get('authtoken'),
    'Accept': 'application/json'
  },
  // causes these the designated actions to run for each response with the
  // given status code, completely bypassing normal lifecycle hooks shown below
  statusActions: {
    // primitive values are dispatched as action types
    419: // Authentication Timeout (non-official)
      actionTypes.SESSION_EXPIRED
    // also accepts functions that are called w/ a dispatch fn and the response
    419: (dispatch, res) => dispatch(actions.sessionTimeout())
  }
}));

// ...
```

#### API:
- `injectedHeaders`: headers that are injected on *every* outgoing request. Values can be a string (or other primitive), function, or promise. Functions are evaluated on every outgoing request, and are given the `state` tree for decision making. Additionally for promises the value that is resolved to will be used as the header value. Note that raw objects will be rejected with a `CallProcessingError`. A common use for this is to inject authorization tokens for authentication with some backend API.
- `statusActions`: actions that are dispatched if the server responds with any of the given HTTP status codes. Note that these actions are meant to provide a hook for completely disrupting & redirecting the flow of the request, such as for when redirecting a user to the signin page if their session/auth token has expired. Values can be a primitive, a function, or an object. If the value is a primitive it will be dispatched in an action with the value being the `type` field. Likewise objects are dispatched verbatim. If the value is a function it will be called on each instance of the assigned status code, and will be given the `dispatch` function and the raw `response` object (from the Fetch API).

### Action Creator
*TODO*

## TODO

## License
See [LICENSE](./LICENSE)
