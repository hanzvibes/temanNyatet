import { Router, type IRouter } from 'express';
import healthRouter from './health';
import webhookRouter from './webhook';
import subscriptionRouter from './subscription';
import cronRouter from './cron';

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(subscriptionRouter);
router.use(cronRouter);

export default router;
