# MentorMatch Platform

A web-based mentorship platform that connects mentors and mentees, allowing users to create profiles, discover potential connections, and manage mentorship relationships.

## Live Demo

- Frontend: [https://ashok-mentorhsip-platform.netlify.app](https://ashok-mentorhsip-platform.netlify.app)
- Backend: [https://mentorship-backend-g3mo.onrender.com](https://mentorship-backend-g3mo.onrender.com)

## Features

- User Authentication (Register/Login)
- Profile Management
- Role-based Access (Mentor/Mentee)
- Profile Discovery with Filtering
- Connection Management
- Real-time Status Updates
- Responsive Design

## Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- CORS

### Deployment
- Frontend: Netlify
- Backend: Render
- Database: MongoDB Atlas

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/your-username/Mentorship-Platform.git
cd Mentorship-Platform
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the root directory:
```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

4. Start the development server:
```bash
npm start
```

## Project Structure

```
Mentorship-Platform/
├── public/                 # Frontend files
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   ├── index.html         # Login page
│   ├── register.html      # Registration page
│   └── dashboard.html     # Main dashboard
├── server/                # Backend files
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   └── server.js        # Main server file
├── .env                  # Environment variables
├── package.json          # Project dependencies
└── README.md            # Project documentation
``
## Configuration

### Environment Variables
```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

### CORS Configuration
The backend is configured to accept requests from:
- https://ashok-mentorhsip-platform.netlify.app
- http://localhost:5001

## Deployment

### Frontend (Netlify)
1. Connect GitHub repository to Netlify
2. Set build command: None (static site)
3. Set publish directory: `public`

### Backend (Render)
1. Connect GitHub repository to Render
2. Create new Web Service
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables in Render dashboard

## License

This project is licensed under the MIT License. 
