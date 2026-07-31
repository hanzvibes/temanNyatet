import { Router, type IRouter } from 'express';
import healthRouter from './health.js';
import webhookRouter from './webhook.js';
import subscriptionRouter from './subscription.js';
import cronRouter from './cron.js';
import authGoogleRouter from './auth-google.js';
import notesRouter from './notes.js';
import transactionsRouter from './transactions.js';
import transactionSummaryRouter from './transaction-summary.js';
import todosRouter from './todos.js';
import linksRouter from './links.js';
import profileRouter from './profile.js';
import spreadsheetRouter from './spreadsheet.js';
import creditsRouter from './credits.js';
import paymentRouter from './payment.js';
import creditPaymentRouter from './credit-payment.js';
import sumopodWebhookRouter from './sumopod-webhook.js';

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(subscriptionRouter);
router.use(cronRouter);
router.use(authGoogleRouter);
router.use(notesRouter);
router.use(transactionSummaryRouter);
router.use(transactionsRouter);
router.use(todosRouter);
router.use(linksRouter);
router.use(profileRouter);
router.use(spreadsheetRouter);
router.use(creditsRouter);
router.use(paymentRouter);
router.use(creditPaymentRouter);
router.use(sumopodWebhookRouter);

export default router;
