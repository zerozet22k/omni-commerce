import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import path from "path";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer: MongoMemoryServer | null;
  memoryServerPromise: Promise<MongoMemoryServer> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const globalCache = globalThis.mongooseCache ?? {
  conn: null,
  promise: null,
  memoryServer: null,
  memoryServerPromise: null,
};

globalThis.mongooseCache = globalCache;

async function getMongoUri() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MONGODB_URI is not configured.");
    }

    if (!globalCache.memoryServerPromise) {
      globalCache.memoryServerPromise = MongoMemoryServer.create({
        instance: {
          dbName: "omnicommerce",
          dbPath: path.join(process.cwd(), ".mongo-dev-data"),
        },
      });
    }

    globalCache.memoryServer = await globalCache.memoryServerPromise;
    return globalCache.memoryServer.getUri();
  }

  return mongoUri;
}

export async function connectToDatabase() {
  if (globalCache.conn) {
    return globalCache.conn;
  }

  if (!globalCache.promise) {
    globalCache.promise = getMongoUri().then((mongoUri) =>
      mongoose.connect(mongoUri, {
        autoIndex: true,
      }),
    );
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}
