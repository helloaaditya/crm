import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  getSubscriptions,
  testPushNotification
} from '../controllers/pushNotificationController.js';

const router = express.Router();

// Public route to get VAPID public key
router.get('/vapid-public-key', getVapidPublicKey);

// Protected routes
router.use(protect);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.get('/subscriptions', getSubscriptions);
router.post('/test', testPushNotification);

export default router;

