const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function run() {
  const start = Date.now();
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected in ${Date.now() - start}ms`);

  const collections = ["users", "companies", "projects", "assignments", "projectassignments", "taskassignments", "supports", "modules", "reports", "chatmessages", "notifications"];
  
  for (const name of collections) {
    const t0 = Date.now();
    try {
      const docs = await mongoose.connection.collection(name).find().toArray();
      console.log(`- Collection ${name}: ${docs.length} docs (fetched in ${Date.now() - t0}ms)`);
    } catch (e) {
      console.log(`- Collection ${name}: Error: ${e.message}`);
    }
  }

  process.exit(0);
}

run().catch(console.error);
