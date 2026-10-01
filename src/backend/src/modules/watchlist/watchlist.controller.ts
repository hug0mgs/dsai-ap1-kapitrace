import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../shared/prisma';

export const getWatchlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.watchlist.findMany({
      where: { userId: req.user.id }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
};

export const addToWatchlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemValue, itemType } = req.body;
    const item = await prisma.watchlist.create({
      data: {
        userId: req.user.id,
        itemValue,
        itemType
      }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
};

export const removeFromWatchlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.watchlist.delete({
      where: { id, userId: req.user.id } // Ensure user owns it
    });
    res.json({ message: 'Removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
};
