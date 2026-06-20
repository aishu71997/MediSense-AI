import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: typeof users.$inferSelect;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    // 1. Verify token
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    // 2. Synchronize user in database
    const email = decodedToken.email || '';
    const name = decodedToken.name || '';
    const uid = decodedToken.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }

    try {
      // Safe upsert
      const result = await db.insert(users)
        .values({
          uid,
          email,
          fullName: name,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
            fullName: name,
          },
        })
        .returning();

      req.dbUser = result[0];
    } catch (dbError) {
      console.error('Failed to get/create user in pool:', dbError);
      // Fallback: If upsert failed, query existing user
      const existing = await db.select().from(users).where(eq(users.uid, uid));
      if (existing.length > 0) {
        req.dbUser = existing[0];
      } else {
        throw new Error('Could not synchronize profile to PostgreSQL', { cause: dbError });
      }
    }

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
