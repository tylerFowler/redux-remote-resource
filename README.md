redux-remote-resource
=====================
Flexible Redux middleware for making remote API calls

*Currently a work in progress, close to being in the initial useable state*

## Usage
This middleware works at two levels: with a top level global configuration, and with an action-by-action interface. This allows us to implement interceptors for common things like session expiration or global 404 Not Found pages.

### Configuration
**At a glance:**
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
*TODO*

### Action Creator
*TODO*

## TODO

## License
See [LICENSE](./LICENSE)
