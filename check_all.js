const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://portalarvic:Portal123456@portal-arvic-cluster.nljgq6k.mongodb.net/arvic-preview?retryWrites=true&w=majority")
.then(async () => {
  const users = await mongoose.connection.collection("users").find().toArray();
  console.log(users.map(u => u.name + " (" + u.userId + ") role: " + u.role));
  process.exit(0);
});
