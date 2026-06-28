require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const adminRoutes = require('./routes/admin');
const User = require('./models/User');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Default Admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@projectflow.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

async function ensureDefaultAdmin() {
  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      isAdmin: true,
    });
    console.log(`Default admin created: ${admin.email}`);
    return;
  }

  let changed = false;
  if (!admin.isAdmin) {
    admin.isAdmin = true;
    changed = true;
  }
  if (admin.name !== ADMIN_NAME) {
    admin.name = ADMIN_NAME;
    changed = true;
  }
  if (changed) {
    await admin.save();
    console.log(`Default admin updated: ${admin.email}`);
  }
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await ensureDefaultAdmin();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
