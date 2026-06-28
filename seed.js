require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Drop all collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    await mongoose.connection.db.dropCollection(col.name);
  }
  console.log('Database cleared');

  // Create admin user (bypass minlength since user requested "TEST")
  const user = new User({
    name: 'Admin',
    email: 'roahansenthilkumar0034257@gmail.com',
    password: 'TEST',
  });
  await user.save({ validateBeforeSave: false });
  console.log(`Admin user created: ${user.email}`);
  console.log(`User ID: ${user._id}`);

  await mongoose.disconnect();
  console.log('Done');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
