import { Router } from 'express';
import { lookupIp } from './lookup.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Temporarily removed authenticate for local testing
router.get('/ip/:ip', lookupIp);

export default router;
