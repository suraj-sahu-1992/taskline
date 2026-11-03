import mongoose from "mongoose";
// Establish MongoDB connectivity with a bounded startup selection timeout.
export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}
