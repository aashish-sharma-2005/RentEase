import dns from 'dns';
import mongoose from 'mongoose';

// Some networks block SRV lookups; use public DNS servers instead
dns.setServers(['8.8.8.8', '1.1.1.1']);

export default async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set. Copy .env.example to .env first.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('MongoDB connected:', mongoose.connection.name);
}