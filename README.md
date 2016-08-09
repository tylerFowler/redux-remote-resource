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
- `injectedHeaders`: headers that are injected on *every* outgoing request. Values can be a string (or other primitive), function, or promise. Functions are evaluated on every outgoing request, and are given the `state` tree for decision making. Additionally for promises the value that is resolved to will be used as the header value. Note that raw objects will be rejected with a `CallProcessingError`. A common use for this is to inject authorization tokens for authentication with some backend API. Also note that any headers written in an action creator with the same key as a header here will overwrite the global header value set here.
- `statusActions`: actions that are dispatched if the server responds with any of the given HTTP status codes. Note that these actions are meant to provide a hook for completely disrupting & redirecting the flow of the request, such as for when redirecting a user to the signin page if their session/auth token has expired. Values can be a primitive, a function, or an object. If the value is a primitive it will be dispatched in an action with the value being the `type` field. Likewise objects are dispatched verbatim. If the value is a function it will be called on each instance of the assigned status code, and will be given the `dispatch` function and the raw `response` object (from the Fetch API).

### Action Creator

#### At a glance:
```javascript
// special Symbol that tells the middleware to process the action
import { RemoteResource } from 'redux-remote-resource';
import actionTypes from '../constants/postConstants';
import * as actions from '../actions/posts';

// Simple GET request
export function fetchPosts(topic) {
  return {
    [RemoteResource]: {
      uri: `/api/topics/${topic}/posts`,
      headers: { 'Accept': 'application/json' },
      lifecycle: {
        request: actionTypes.FETCH_POSTS_REQUEST,
        success: actionTypes.FETCH_POSTS_SUCCESS,
        failure: actionTypes.FETCH_POSTS_FAILURE
      }
    }
  };
}

// POST request
export function createPost(topic, postData) {
  return {
    [RemoteResource]: {
      uri: `/api/topics/${topic}/posts`,
      method: 'post',
      body: postData,
      lifecycle: {
        request: {
          type: actionTypes.CREATE_POST_REQUEST, topic
        },
        success: (data, dispatch) => {
          dispatch(actions.postEditSuccess());
          dispatch(actions.createPost(data._id, data));
        },
        failure: (error, dispatch) => {
          dispatch(actions.postEditFailure(error));
        }
      }
    }
  };
}
```

#### API:
- `uri`: the endpoint to hit, can be a relative or absolute path, is passed into Fetch verbatim
- `method`: HTTP method to use, case insensitive. Default: `GET`
- `headers`: any additional headers to include with the request
  - NOTE: if the `body` value is an object, the header `{'Content-Type': 'application/json'}` will be automatically injected, but will not be written if there is another `Content-Type` header set in the action creator 'headers' field
- `body`: the data sent to the server in the request body, accepts types:
  - Promise: will continuously resolve recursively until an acceptable, non-promise value is reached, using that value as the body
  - Object: will be stringified
  - Function: will be called with the current state tree, with the returned value being used as the body
  - Primitive values are simply passed along
- `lifecycle`: contains hooks that govern the emitted values during the request, any of these can be omitted to simply not do anything for that part of the request **(NOTE: not yet implemented, if any are empty an error will be thrown)**. These hooks can just be primitive values or objects, in which case they will be dispatched as actions. See below for arguments when these values are functions.
  - `request`: ran directly before making the API call
    - If this hook is a function it will be called with `(dispatch)`
    - Will *always* run regardless of statusActions
  - `success`: ran after receiving a successful response (i.e. HTTP status code is in the 200 range)
    - If a function it will be called with `(data, dispatch, response)`
    - Will never run if a `statusAction` is triggered
  - `failure`: ran after receiving a failed response (i.e. HTTP status code is *not* in the 200 range)
    - If a function it will be called with `(error, dispatch, data, response)`
    - Will never run if a `statusAction` is triggered
- `bypassStatusActions`: completely disables the `statusAction` hooks for this request
- `requestOpts`: this field will be merged with the fetch request object that is generated from some of the above fields (i.e. method, body, headers, etc...), with the options here overwriting the options set in the action creator; can be used to set arbitrary options in the final call to the Fetch API

## TODO
- [ ] Write tests for `callRemoteResource` (in `remoteCall.js`)
- [ ] Pull some middleware hook processing into the Request Builder pipeline as functions & test
- [ ] Allow lifecycle hooks to be skipped when not defined
- [ ] Add caching mechanism that maps a request to it's corresponding part of the state

## License
See [LICENSE](./LICENSE)
