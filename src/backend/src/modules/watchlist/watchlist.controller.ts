import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../shared/prisma';
import {
  isValidIPv4,
  isValidIPv6,
  isValidDomain,
  isValidHash
} from '../threat-analyzer/validators';

export const getWatchlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const items = await prisma.watchlist.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
};

export const addToWatchlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { itemValue, itemType } = req.body;

    if (!itemValue || !itemType) {
      res.status(400).json({ error: 'itemValue and itemType are required' });
      return;
    }

    const cleanValue = String(itemValue).trim();
    const cleanType = String(itemType).trim().toLowerCase();

    // Validate type and value conformity
    if (cleanType === 'ip') {
      if (!isValidIPv4(cleanValue) && !isValidIPv6(cleanValue)) {
        res.status(400).json({ error: 'Invalid IP address format' });
        return;
      }
    } else if (cleanType === 'domain') {
      if (!isValidDomain(cleanValue)) {
        res.status(400).json({ error: 'Invalid domain format conforming to RFC 1035' });
        return;
      }
    } else if (cleanType === 'hash') {
      if (!isValidHash(cleanValue)) {
        res.status(400).json({ error: 'Invalid cryptographic hash format (MD5, SHA-1, SHA-256)' });
        return;
      }
    } else if (cleanType === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue)) {
        res.status(400).json({ error: 'Invalid email address format' });
        return;
      }
    } else {
      res.status(400).json({ error: `Unsupported itemType "${itemType}"` });
      return;
    }

    const item = await prisma.watchlist.create({
      data: {
        userId: req.user.id,
        itemValue: cleanValue,
        itemType: cleanType
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
};

export const removeFromWatchlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Verify ownership before deleting
    const item = await prisma.watchlist.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!item) {
      res.status(404).json({ error: 'Watchlist item not found or unauthorized' });
      return;
    }

    await prisma.watchlist.delete({
      where: { id }
    });

    res.json({ message: 'Removed successfully', id });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
};
