require('babel-register');

const test            = require('tape');
const { cacheLookup } = require('../lib/middleware');

const cacheMapMock = () => true;

test('cacheLookup', t => {
  t.plan(6);

  const uncacheableMethod = 'POST';
  cacheLookup({}, {
    method: uncacheableMethod, nocache: false, cacheMapping: cacheMapMock
  })
  .then(res => t.notok(res, 'skips cache for uncacheable methods'))
  .catch(t.fail);

  cacheLookup({}, { method: 'GET', nocache: true, cacheMapping: cacheMapMock })
  .then(res => t.notok(res, 'skips cache if nocache is true'))
  .catch(t.fail);

  cacheLookup({}, { method: 'GET', nocache: false })
  .then(res => t.notok(res, 'skips cache if cache mapping is not defined'))
  .catch(t.fail);

  cacheLookup({}, { method: 'GET', cacheMapping: () => true })
  .then(res => t.ok(res, 'uses cache is cacheMapping returns true'))
  .catch(t.fail);

  cacheLookup({ k: true }, { method: 'GET', cacheMapping: state => state.k })
  .then(res => t.ok(res, 'state is passed to cacheMapping'))
  .catch(t.fail);

  const errCacheMapping = () => { throw new Error('Error!'); };
  cacheLookup({}, { method: 'GET', cacheMapping: errCacheMapping })
  .then(() => t.fail('should have thrown error from cacheMapping fn'))
  .catch(err => t.ok(err, 'forwards errors from cacheMapping fn'));
});
