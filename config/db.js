import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' MongoDB connected successfully');
  } catch (err) {
    console.error(' MongoDB connection error:', err);
    console.log(' Server will continue without database.');
  }
};

export default connectDB;
