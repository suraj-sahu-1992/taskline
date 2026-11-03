import mongoose from "mongoose";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
try {
  await connectDatabase(env.MONGODB_URI);
  const server = app.listen(env.PORT, "127.0.0.1", () =>
    console.log(`API ready at http://127.0.0.1:${env.PORT}; MongoDB connected`),
  );
  server.on("error", async () => {
    console.error("Could not start HTTP server");
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  // Stop accepting requests and close MongoDB, with a bounded shutdown deadline.
  const shutdown = () => {
    const timeout = setTimeout(() => process.exit(1), 10_000).unref();
    server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(timeout);
      process.exit(0);
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
} catch {
  console.error(
    "Startup failed. Check MongoDB availability and server environment configuration.",
  );
  process.exitCode = 1;
}
