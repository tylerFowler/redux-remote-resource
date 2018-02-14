require('babel-register');

const test      = require('tape');
const parseBody = require('../lib/builders/parseBody').default;

test('parseBody', t => {
  t.plan(6);

  const plainBody = 'Plain body';
  parseBody({}, plainBody)
    .then(b => t.equal(b, plainBody, 'plain strings go through unchanged'))
    .catch(t.fail);

  const promiseBody = Promise.resolve('body');
  parseBody({}, promiseBody)
    .then(b => t.equal(b, 'body', 'accepts promises & waits for resolution'))
    .catch(t.fail);

  const fnBody = () => 'body';
  parseBody({}, fnBody)
    .then(b => t.equal(b, 'body', 'able to run a function returning in a body'))
    .catch(t.fail);

  const statefulFn = state => state.msg;
  parseBody({ msg: 'body' }, statefulFn)
    .then(b => t.equal(b, 'body', 'passes state to body functions'))
    .catch(t.fail);

  const errFn = () => { throw new Error('Body error'); };
  parseBody({}, errFn)
    .then(() => t.fail('should have thrown an error'))
    .catch(err =>
      t.equal(err.name, 'CallProcessingError', 'throws error from body fn')
    );

  const objBody = { message: 'body' };
  parseBody({}, objBody)
    .then(b => t.equal(b, '{"message":"body"}', 'will convert objects to strings'))
    .catch(t.fail);
});
