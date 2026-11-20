import { getDatabase } from "@/app/lib/db/mongodb";

export const PENDING_SIGNUPS = "pendingSignups";
export const USERS = "users";

export async function ensureSignupIndexes(db) {
  await Promise.all([
    db.collection(USERS).createIndex({ email: 1 }, { unique: true }),
    db.collection(PENDING_SIGNUPS).createIndex({ email: 1 }, { unique: true }),
    db.collection(PENDING_SIGNUPS).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

export async function findExistingUser(email) {
  const db = await getDatabase();
  await ensureSignupIndexes(db);
  return db.collection(USERS).findOne({ email }, { projection: { _id: 1 } });
}
