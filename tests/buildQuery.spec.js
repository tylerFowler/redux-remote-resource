require('babel-register');

const test = require('tape');
const buildQuery = require('../lib/builders/buildQuery').default;
const { failTest, nest } = require('./mock.helper');

test.only('buildQuery', st => {
  st.test(nest('flat object'), t => {
    const params = { a: '', b: 'hello world', c: 5 };
    const expected = '?a=&b=hello%20world&c=5';

    return buildQuery(params)
      .then(actual => {
        t.equals(actual, expected, 'converts to a valid query string');
        t.end();
      }).catch(failTest(t));
  });

  st.test(nest('nested object'), t => {
    const params = { parent: { a: 'hello', b: 'world' }, c: 1 };
    const expected = '?parent=%7B%22a%22%3A%22hello%22%2C%22b%22%3A%22world%22%7D&c=1';

    return buildQuery(params)
      .then(actual => {
        t.equals(actual, expected, 'converts child to encoded json string');
        t.end();
      }).catch(failTest(t));
  });

  st.test(nest('array parameter'), t =>
    buildQuery([ 1, 2, 3 ])
      .then(failTest(t))
      .catch(err => t.ok(err, 'throws error when given an array'))
      .then(() => t.end())
  );

  st.test(nest('non-object parameter'), t =>
    buildQuery('invalid')
      .then(failTest(t))
      .catch(err => t.ok(err, 'throws error when given a non-object'))
      .then(() => t.end())
  );
});
