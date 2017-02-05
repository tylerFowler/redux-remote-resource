redux-remote-resource
=====================
Flexible Redux middleware for making remote API calls

## Usage
This middleware works at two levels: with a top level global configuration, and with an action-by-action interface. This allows us to implement interceptors for common things like session expiration or global 404 Not Found pages.

It's highly recommended that you place this middleware first in the chain, not doing so will cause some other middlewares to not catch the lifecycle hook dispatches. For example placing this middleware after `react-router-redux` will completely break it's built in action creators like `goBack()`.

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
- `statusActions`: actions that are dispatched if the server responds with any of the given HTTP status codes. Note that these actions are meant to provide a hook for completely disrupting & redirecting the flow of the request, such as for when redirecting a user to the signin page if their session/auth token has expired. Values can be a primitive, a function, promise, or an object. If the value is a primitive it will be dispatched in an action with the value being the `type` field. Likewise objects are dispatched verbatim. If the value is a function it will be called on each instance of the assigned status code, and will be given the `dispatch` function and the raw `response` object (from the Fetch API). Note that if the value is a promise it must resolve to a valid instance of one of the other types (though errors will be caught).
- `requestOpts`: arbitrary options that are passed into the Fetch call's settings object, can be overwritten by the same key on an API call action creator. Useful for setting global cookie behavior.

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
- `lifecycle`: contains hooks that govern the emitted values during the request, any of these can be omitted to simply not do anything for that part of the request. These hooks can just be primitive values or objects, in which case they will be dispatched as actions. See below for arguments when these values are functions.
  - `request`: ran directly before making the API call
    - If this hook is a function it will be called with `(dispatch)`
    - Will *always* run regardless of statusActions
  - `success`: ran after receiving a successful response (i.e. HTTP status code is in the 200 range)
    - If a function it will be called with `(data, dispatch, response)`
    - Will never run if a `statusAction` is triggered
  - `failure`: ran after receiving a failed response (i.e. HTTP status code is *not* in the 200 range)
    - If a function it will be called with `(error, dispatch, data, response)`
    - Will never run if a `statusAction` is triggered
- `cacheMapping`: a function that is called with the state, if this function resolves (or otherwise evaluates) to a truthy value this value will be used to immediately trigger the success callback with that value, if it evaluates to a falsy value then the request will continue as normal
  - Note that the cache will not be used for `POST`, `PUT`, or `DELETE` HTTP methods, nor will it be used if no `cacheMapping` function is given
- `nocache`: a boolean value that can be used to disable caching for the API call
- `bypassStatusActions`: completely disables the `statusAction` hooks for this request
- `requestOpts`: this field will be merged with the fetch request object that is generated from some of the above fields (i.e. method, body, headers, etc...), with the options here overwriting the options set in the action creator; can be used to set arbitrary options in the final call to the Fetch API

### Caching
Caching for all request types except `POST`, `PUT`, or `DELETE` can be used to link an API call with a specific part of the application state using a special mapping function passed into an action creator with the `cacheMapping` key. The `cacheMapping` value should be a function that accepts the application state and returns a value that will then cause the API call to short circuit and immediately invoke success with the value. If the function returns a falsy value then the request will continue as normal. Additionally the `nocache` key can also be set to skip the caching altogether.

*Note: the cache has no concept of a TTL so be careful only to use the caching feature with values that are not likely to change in a single session, or until the state is cleared*

**Example:**
```javascript
export function fetchPost(postid) {
  return {
    [RemoteResource]: {
      uri: `/api/posts/${postid}`,
      cacheMapping: state => state.posts[postid],
      lifecycle: {
        request: actionTypes.FETCH_POST_REQUEST,
        success: actionTypes.FETCH_POST_SUCCESS,
        failure: actionTypes.FETCH_POST_FAILURE
      }
    }
  };
}

// a slightly more involved example where the cached value has a default value
export function fetchPostComments(postid) {
  return {
    [RemoteResource]: {
      uri: `/api/posts/${postid}/comments`,
      cacheMapping: state => {
        const { comments } = state.posts[postid];
        // comments defaults to an empty array and so will always return a
        // truthy value
        if (comments.length > 0) return comments;
        return false;
      },
      lifecycle: {
        request: actionTypes.FETCH_POST_COMMENTS_REQUEST,
        success: (data, response) => {
          // data has the comments directly from the state
          // note that if the cached value is returned as opposed to an API
          // call then the response object will be undefined
          dispatch(updatePostComments(postid, data));
        }
      }
    }
  }
}
```

## TODO
- [ ] Write end-to-end middleware tests
- [ ] Remove deps on polyfills, turn this package into a BYOP (Bring Your Own Polyfills) for everything *except* fetch
- [ ] Add support for hooks that are functions returning promises

## License
See [LICENSE](./LICENSE)
