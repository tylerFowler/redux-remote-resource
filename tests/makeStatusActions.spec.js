require('babel-register');

const test = require('tape');
const { makeStatusActions } = require('../lib/requestBuilders');

test('makeStatusActions', t => {
  t.plan(8);

  const plainActions = { 400: 'SOME_ACTION' };
  const plainDispatch = action => t.equal(
    action.type, 'SOME_ACTION', 'dispatches given action as type'
  );
  makeStatusActions(plainActions, plainDispatch)
  .then(sa => sa[400]())
  .catch(t.fail);

  const fnDispatch = () => true;
  const fnRes = { code: 400 };
  const fnActions = {
    400: (dispatch, res) => {
      t.equal(dispatch, fnDispatch, 'called action w/ dispatch');
      t.equal(res, fnRes, 'called action w/ response');
    }
  };
  makeStatusActions(fnActions, fnDispatch)
  .then(sa => sa[400](fnRes))
  .catch(t.fail);

  const objActions = { 400: { type: 'FORBIDDEN_FRUIT' } };
  const objDispatch = act => t.equal(act, objActions[400], 'dispatches action');
  makeStatusActions(objActions, objDispatch)
  .then(sa => sa[400]())
  .catch(t.fail);

  const pActions = { 400: Promise.resolve('BAD_ERROR') };
  const pDispatch = act => {
    t.equal(act.type, 'BAD_ERROR', 'dispatches promised values');
  };
  makeStatusActions(pActions, pDispatch)
  .then(sa => sa[400]())
  .catch(t.fail);

  const rpActions = {
    400: Promise.resolve().then(() => ({ type: 'BAD_ERROR' }))
  };
  const rpDispatch = act =>
    t.equal(act.type, 'BAD_ERROR', 'dispatches promised values recursively');
  makeStatusActions(rpActions, rpDispatch)
  .then(sa => sa[400]())
  .catch(t.fail);

  const multActions = {
    400: 'SOME_ACTION',
    401: { type: 'SOME_OTHER_ACTION' },
    402: Promise.resolve(() => {}),
    403: () => {}
  };
  const multDispatch = () => {};
  makeStatusActions(multActions, multDispatch)
  .then(sa => {
    t.true(
      sa.hasOwnProperty(400) && sa.hasOwnProperty(401) &&
      sa.hasOwnProperty(402) && sa.hasOwnProperty(403),
      'actions are reduced back into an object keyed by status codes'
    );

    t.true(
      Object.keys(sa).every(k => typeof sa[k] === 'function'),
      'actions values are reduced into callback functions'
    );
  }).catch(t.fail);
});
