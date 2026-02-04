import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { apartmentRouter } from './modules/apartment/apartment.router';
import { authRouter } from './modules/auth/auth.router';
import { billingRouter } from './modules/billing/billing.router';
import { dashboardRouter } from './modules/dashboard/dashboard.router';
import { leaseRouter } from './modules/lease/lease.router';
import { notificationRouter } from './modules/notification/notification.router';
import { orgRouter } from './modules/org/org.router';
import { signingRouter } from './modules/signing/signing.router';
import { tenantRouter } from './modules/tenant/tenant.router';
import { openapi } from './openapi';

export const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));

router.get('/openapi.json', (_req, res) => res.json(openapi));
router.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

router.use('/auth', authRouter);
router.use('/orgs', orgRouter);
router.use('/orgs', apartmentRouter);
router.use('/orgs', billingRouter);
router.use('/orgs', dashboardRouter);
router.use('/orgs', tenantRouter);
router.use('/orgs', leaseRouter);
router.use('/orgs', signingRouter);
router.use('/orgs', notificationRouter);

