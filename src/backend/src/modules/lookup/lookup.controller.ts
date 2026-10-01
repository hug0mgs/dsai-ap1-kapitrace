import { Request, Response } from 'express';
import prisma from '../../shared/prisma';

export const lookupIp = async (req: Request, res: Response): Promise<void> => {
  const { ip } = req.params;
  
  try {
    // 1. Check Database Cache
    const cached = await prisma.ipCache.findUnique({ where: { ip } });
    if (cached) {
      // Check TTL (e.g., 24 hours)
      const isExpired = new Date().getTime() - cached.updatedAt.getTime() > 24 * 60 * 60 * 1000;
      if (!isExpired) {
        res.json({ source: 'cache', data: { ...cached, data: JSON.parse(cached.data) } });
        return;
      }
    }

    // 2. Mock Fetching from External APIs
    const threatScore = Math.floor(Math.random() * 100);
    const apiData = {
      abuseIPDB: { score: threatScore, reports: 5 },
      ipinfo: { country: 'US', asn: 'AS15169' }
    };

    // 3. Save to DB Cache
    const saved = await prisma.ipCache.upsert({
      where: { ip },
      update: { threatScore, data: JSON.stringify(apiData) },
      create: { ip, threatScore, data: JSON.stringify(apiData) }
    });

    res.json({ source: 'api', data: { ...saved, data: apiData } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to lookup IP' });
  }
};
