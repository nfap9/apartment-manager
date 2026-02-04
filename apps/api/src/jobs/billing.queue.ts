import { Queue } from 'bullmq';

import { getBullConnection } from './connection';

export const BILLING_QUEUE_NAME = 'billing';

export function createBillingQueue() {
  return new Queue(BILLING_QUEUE_NAME, {
    connection: getBullConnection(),
  });
}

