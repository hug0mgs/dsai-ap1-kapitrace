import { Router } from 'express';
import { lookupIp, lookupIndicator } from './lookup.controller';

import { authenticate } from '../../middleware/auth';
import { limitLookup } from '../../middleware/lookup-limit';

const router = Router();
router.use(authenticate);
router.use(limitLookup);

// Endpoint for direct IP lookup (backward-compatible)
router.get('/ip/:ip', lookupIp);

// Endpoint for typed indicator lookup: /api/lookup/domain/:indicator, /api/lookup/hash/:indicator, etc.
router.get('/:type/:indicator', lookupIndicator);

export default router;
