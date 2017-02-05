require('babel-register');

const test            = require('tape');
const { cacheLookup } = require('../lib/requestBuilders');

const cacheMapMock = () => true;

test.only('cacheLookup', t => {
  t.plan(8);

  cacheLookup({}, { method: 'POST', nocache: false, cacheMapping: cacheMapMock })
  .then(res => t.notok(res, 'skips cache for uncacheable methods'))
  .catch(t.fail);

  cacheLookup({}, { method: 'GET', nocache: true, cacheMapping: cacheMapMock })
  .then(res => t.notok(res, 'skips cache if nocache is true'))
  .catch(t.fail);

  cacheLookup({}, { method: 'GET', nocache: false })
  .then(res => t.notok(res, 'skips cache if cache mapping is not defined'))
  .catch(t.fail);

  cacheLookup({}, { method: 'GET', cacheMapping: () => true })
  .then(res => t.ok(res, 'uses cache if cacheMapping returns true'))
  .catch(t.fail);

  cacheLookup({ k: 'value' }, { method: 'GET', cacheMapping: state => state.k })
  .then(res => t.ok(res, 'state is passed to cacheMapping'))
  .catch(t.fail);

  const promiseMapping = () => Promise.resolve(2);
  cacheLookup({}, { method: 'GET', cacheMapping: promiseMapping })
  .then(res => t.equal(res, 2, 'promises are allowed in mapping fn'))
  .catch(t.fail);

  const multiPromiseMapping = state => Promise.resolve().then(() => state.v);
  cacheLookup({ v: 2 }, { method: 'GET', cacheMapping: multiPromiseMapping })
  .then(res => t.equal(res, 2, 'promises are evaluated to completion'))
  .catch(t.fail);

  const errCacheMapping = () => { throw new Error('Error!'); };
  cacheLookup({}, { method: 'GET', cacheMapping: errCacheMapping })
  .then(() => t.fail('should have thrown error from cacheMapping fn'))
  .catch(err => t.ok(err, 'forwards errors from cacheMapping fn'));
});
