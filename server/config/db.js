const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongooseOptions = {
            serverSelectionTimeoutMS: 30000, 
            socketTimeoutMS: 45000, // 45 seconds
        };

        const conn = await mongoose.connect(process.env.MONGO_URI, mongooseOptions);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;