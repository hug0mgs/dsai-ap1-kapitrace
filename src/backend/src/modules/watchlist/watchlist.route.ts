import { Router } from 'express';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from './watchlist.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getWatchlist);
router.post('/', addToWatchlist);
router.delete('/:id', removeFromWatchlist);

export default router;
