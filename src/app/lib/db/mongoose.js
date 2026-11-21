import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) throw new Error("Missing MONGODB_URI environment variable");

const globalMongoose = globalThis;
const cache = globalMongoose.__sahalakMongoose || { connection: null, promise: null };

if (process.env.NODE_ENV !== "production") globalMongoose.__sahalakMongoose = cache;

export async function connectMongoose() {
  if (cache.connection && mongoose.connection.readyState === 1) return cache.connection;

  if (!cache.promise) cache.promise = mongoose.connect(uri, { bufferCommands: false });

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}
