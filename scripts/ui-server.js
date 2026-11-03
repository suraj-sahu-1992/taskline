// A real, isolated MongoDB process for browser tests; never touches the configured app database.
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { app } from "../server/src/app.js";
import { connectDatabase } from "../server/src/config/database.js";
import { env } from "../server/src/config/env.js";
const mongo = await MongoMemoryServer.create();
await connectDatabase(mongo.getUri());
const server = app.listen(env.PORT, "127.0.0.1", () =>
  console.log(`Browser-test API ready on ${env.PORT}`),
);
// Tear down the isolated browser-test API and its MongoDB process.
async function stop() {
  server.close();
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
