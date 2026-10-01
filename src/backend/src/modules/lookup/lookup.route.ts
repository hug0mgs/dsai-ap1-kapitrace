import { Router } from 'express';
import { lookupIp, lookupIndicator } from './lookup.controller';

const router = Router();

// Endpoint for direct IP lookup (backward-compatible)
router.get('/ip/:ip', lookupIp);

// Endpoint for typed indicator lookup: /api/lookup/domain/:indicator, /api/lookup/hash/:indicator, etc.
router.get('/:type/:indicator', lookupIndicator);

export default router;
