const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const connectionRoutes = require('./routes/connectionRoutes');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

connectDB();

const app = express();

app.use(cors()); // Enable CORS for all origins (restrict in production)
app.use(express.json()); // Middleware to parse JSON bodies

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to serve index.html for client-side routing (if using SPA approach)
// For multi-page, ensure direct links work or handle 404 appropriately.
// This example assumes multi-page, direct access to HTML files.
// If you adopt a single index.html loading content dynamically, uncomment the next lines:
/*
app.get('*', (req, res) => {
   res.sendFile(path.resolve(__dirname, '../public', 'index.html'));
});
*/

// Basic Error Handling Middleware (optional, can be more sophisticated)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));