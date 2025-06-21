// server/server.js (Corrected with Webhook Route)

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

dotenv.config();

const userRoutes = require('./routes/userRoutes');
const truckRoutes = require('./routes/truckRoutes');
const loadRoutes = require('./routes/loadRoutes');
const stripeRoutes = require('./routes/stripeRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const mapsRoutes = require('./routes/mapsRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

  // CORS configuration - ADD THIS SECTION
const corsOptions = {
  origin: [
    //'http://localhost:3000', // Development
    //'http://localhost:3001', // Alternative dev port
    process.env.FRONTEND_URL, // Your production frontend URL
    //'https://your-frontend-domain.com', // Replace with your actual domain
    //'https://your-app.netlify.app', // If using Netlify
    'https://load-network-app.vercel.app/', // If using Vercel
  ].filter(Boolean), // Remove any undefined values
  credentials: true,
  optionsSuccessStatus: 200,
  //methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
//app.use(cors());

// Stripe requires the raw request body to verify signatures, not the parsed JSON.
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/loads', loadRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/maps', mapsRoutes);
app.use('/api/alerts', require('./routes/alertRoutes'));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Frontend URL configured: ${process.env.FRONTEND_URL}`);
});