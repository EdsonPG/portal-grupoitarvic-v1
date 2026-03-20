const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://portalarvic:Portal123456@portal-arvic-cluster.nljgq6k.mongodb.net/arvic-preview?retryWrites=true&w=majority")
.then(async () => {
  const msgs = await mongoose.connection.collection("chatmessages").aggregate([{ $match: { read: false } }]).toArray();
  console.log("Unread messages:");
  msgs.forEach(m => console.log(m.senderId, '->', m.receiverId, ' | text:', String(m.message).substring(0,40)));
  process.exit(0);
});
