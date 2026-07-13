import { Router, type IRouter } from 'express';
import healthRouter from './health';
import webhookRouter from './webhook';
import subscriptionRouter from './subscription';
import cronRouter from './cron';
import notesRouter from './notes';
import transactionsRouter from './transactions';
import todosRouter from './todos';
import linksRouter from './links';
import profileRouter from './profile';

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(subscriptionRouter);
router.use(cronRouter);
router.use(notesRouter);
router.use(transactionsRouter);
router.use(todosRouter);
router.use(linksRouter);
router.use(profileRouter);

export default router;
