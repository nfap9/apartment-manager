import 'dotenv/config';

import { Worker } from 'bullmq';

import { BILLING_QUEUE_NAME, createBillingQueue } from './jobs/billing.queue';
import { getBullConnection } from './jobs/connection';
import { logger } from './logger';
import { generateDueInvoices } from './modules/billing/billing.service';

async function main() {
  const connection = getBullConnection();

  const billingQueue = createBillingQueue();

  // Run hourly (simple default). You can adjust to daily by changing cron.
  await billingQueue.add(
    'generateDueInvoices',
    {},
    {
      jobId: 'generateDueInvoices',
      repeat: { pattern: '0 * * * *' },
    },
  );

  const worker = new Worker(
    BILLING_QUEUE_NAME,
    async (job) => {
      if (job.name === 'generateDueInvoices') {
        return await generateDueInvoices({ now: new Date() });
      }
      return null;
    },
    { connection },
  );

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, name: job.name, result }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, name: job?.name, err }, 'Job failed');
  });

  logger.info('Worker started');
}

main().catch((err) => {
  logger.error({ err }, 'Worker failed');
  process.exitCode = 1;
});

