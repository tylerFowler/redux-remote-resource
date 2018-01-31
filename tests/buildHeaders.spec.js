require('babel-register');

const test             = require('tape');
const { buildHeaders } = require('../lib/requestBuilders');
const { failTest, nest } = require('./mock.helper');

test('buildHeaders', st => {
  st.test(nest('plain headers'), t => {
    const headers = { 'Content-Type': 'application/json' };
    const expected = { 'Content-Type': 'application/json' };
    return buildHeaders({}, { headers }, {})
      .then(h => {
        t.deepEqual(h, expected, 'forwards plain headers');
        t.end();
      }).catch(failTest(t));
  });

  st.test(nest('injected headers'), t => {
    const headers = { 'myheader': 'val' };
    const injected = { 'global-header': 'global' };
    const expected = { 'myheader': 'val', 'global-header': 'global' };
    return buildHeaders({}, { headers }, injected)
      .then(h => t.deepEqual(h, expected, 'can inject headers'))
      .then(() => buildHeaders({}, { headers: { 'global-header': 'gl' } }))
      .then(h => {
        t.deepEqual(h, { 'global-header': 'gl' }, 'can overwrite injected headers');
        t.end();
      })
      .catch(failTest(t));
  });

  st.test(nest('automatic body type detection'), t => {
    const headers = { 'myheader': 'val' };
    const prefilled = { 'Content-Type': 'octet-stream' };
    const body = { key: 'value' };
    const expected = { 'myheader': 'val', 'Content-Type': 'application/json' };
    return buildHeaders({}, { headers, body }, {})
      .then(h => t.deepEqual(h, expected, 'adds content type for object bodies'))
      .then(() => buildHeaders({}, { headers: prefilled, body }, {}))
      .then(h => {
        t.deepEqual(h, prefilled, "doesn't overwrite existing content types");
        t.end();
      })
      .catch(failTest(t));
  });

  st.test(nest('function headers'), t => {
    const headers = { 'some-header': () => 'some-value' };

    const stateHeaders = { 'fn': state => state.val };
    const state = { val: 'state-val' };

    const filteredHeaders = {
      'some-header': 'some-value',
      'other-header': () => false
    };

    const expected = { 'some-header': 'some-value' };
    const errHeaders = { 'some-header': () => { throw new Error('Error'); } };
    return buildHeaders({}, { headers }, {})
      .then(h => t.deepEqual(h, expected, 'can provide functions as values'))
      .then(() => buildHeaders({}, { headers: filteredHeaders }, {}))
      .then(h => t.deepEqual(h, expected, 'filters out falsey values'))
      .then(() => buildHeaders(state, { headers: stateHeaders }, {}))
      .then(h => t.deepEqual(h, { fn: 'state-val' }, 'fns are given state tree'))
      .catch(t.fail)
      .then(() => buildHeaders({}, { headers: errHeaders }, {}))
      .then(() => { t.fail('should have thrown error'); t.end(); })
      .catch(err => { t.ok(err, 'forwards function errors'); t.end(); });
  });

  st.test(nest('promise headers'), t => {
    const headers = { 'some-header': Promise.resolve('some-value') };
    const expected = { 'some-header': 'some-value' };
    return buildHeaders({}, { headers })
      .then(h => {
        t.deepEqual(h, expected, 'follows promise values to resolution');
        t.end();
      }).catch(failTest(t));
  });

  st.test(nest('object headers'), t => {
    const headers = { 'some-header': { 'nested-header': 'nested-value' } };
    return buildHeaders({}, { headers })
      .then(() => {
        t.fail('should have thrown an error for object value');
        t.end();
      }).catch(err => { t.ok(err, 'threw error for object value'); t.end(); });
  });

  st.test(nest('mixed headers'), t => {
    const headers = {
      'some-header': 'some-val',
      'fn-header': state => `fn-val${state.val}`,
      'promise-header': Promise.resolve('promise-val')
    };

    const state = { val: 's' };
    const injected = { 'x-access-token': 'authtoken' };
    const body = { a: 1 };

    const expected = {
      'some-header': 'some-val',
      'fn-header': 'fn-vals',
      'promise-header': 'promise-val',
      'Content-Type': 'application/json',
      'x-access-token': 'authtoken'
    };

    return buildHeaders(state, { headers, body }, injected)
      .then(h => {
        t.deepEqual(h, expected, 'can use a mix of all types of headers');
        t.end();
      }).catch(failTest(t));
  });

  st.end();
});
