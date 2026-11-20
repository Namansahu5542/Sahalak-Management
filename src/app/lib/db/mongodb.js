import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

const globalMongo = globalThis;
let clientPromise = globalMongo.__sahalakMongoClient;

export async function getDatabase() {
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
    if (process.env.NODE_ENV !== "production") globalMongo.__sahalakMongoClient = clientPromise;
  }
  const client = await clientPromise;
  return client.db();
}
