const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://portalarvic:Portal123456@portal-arvic-cluster.nljgq6k.mongodb.net/arvic-preview?retryWrites=true&w=majority")
.then(async () => {
  const msgs = await mongoose.connection.collection("chatmessages").deleteMany({ senderId: "admin", receiverId: "admin" });
  console.log("Self-messages deleted:", msgs.deletedCount);
  process.exit(0);
});
