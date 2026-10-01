import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './modules/auth/auth.route';
import lookupRoutes from './modules/lookup/lookup.route';
import watchlistRoutes from './modules/watchlist/watchlist.route';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Only log HTTP requests outside test environment
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use('/api/auth', authRoutes);
app.use('/api/lookup', lookupRoutes);
app.use('/api/watchlist', watchlistRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

export { app };
export default app;
