import dotenv from 'dotenv';
import mongoose from 'mongoose';

// load .env from current working directory (simpler and more robust)
dotenv.config();

async function run() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error('SMOKE ERROR: MONGO_URL is not set. See backend/.env.example');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 });
    console.log('SMOKE OK: connected to MongoDB');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('SMOKE ERROR:', err.message);
    process.exit(1);
  }
}

run();
