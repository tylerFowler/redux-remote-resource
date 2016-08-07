require('babel-register');

const test = require('tape');
const utils = require('../lib/utils');

test('Utility: uncacheableMethods', t => {
  const { isCacheableRequest } = utils;
  const get = 'GET';
  t.ok(isCacheableRequest(get), 'get is cacheable');

  const post = 'POST';
  t.notok(isCacheableRequest(post), 'post is not cacheable');

  const put = 'PUT';
  t.notok(isCacheableRequest(put), 'put is not cacheable');

  const del = 'DELETE';
  t.notok(isCacheableRequest(del), 'delete is not cacheable');

  const cust = 'NOTAMETHOD';
  t.ok(isCacheableRequest(cust), 'custom methods are cacheable');

  const mixedCaps = 'pOsT';
  t.notok(isCacheableRequest(mixedCaps), 'it is not case sensitive');

  t.end();
});

test('Utility: isPromise', t => {
  const { isPromise } = utils;

  const realPromise = Promise.resolve(0);
  t.ok(isPromise(realPromise), 'a promise is in fact a promise');

  const obj = { key: 'value' };
  t.notok(isPromise(obj), 'an object is not necessarily a promise');

  const convincingObj = { then: 1, catch: 'a' };
  t.notok(isPromise(convincingObj), 'then & catch must be functions');

  const halfPromise = { then: () => {} };
  t.notok(isPromise(halfPromise), 'both then AND catch must be present');

  t.notok(isPromise(null), 'catches null values');
  t.notok(isPromise(void 0), 'catches undefined values');

  t.end();
});