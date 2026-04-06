const assert = require('node:assert/strict');

const { createCancelLog } = require('../.test-dist/utils/cancelLog');

const run = () => {
  const created = createCancelLog(
    {
      orderNumber: 'INV-10',
      reason: 'Customer Cancel',
      subtotal: 50,
      discount: 5,
      tax: 4.5,
      total: 49.5,
      itemCount: 2,
    },
    {
      id: 'cancel-fixed',
      now: new Date('2026-04-06T10:15:00.000Z'),
    }
  );

  assert.deepEqual(created, {
    id: 'cancel-fixed',
    orderNumber: 'INV-10',
    reason: 'Customer Cancel',
    subtotal: 50,
    discount: 5,
    tax: 4.5,
    total: 49.5,
    itemCount: 2,
    createdAt: '2026-04-06T10:15:00.000Z',
  });

  console.log('cancel-log.test.js: OK');
};

run();
