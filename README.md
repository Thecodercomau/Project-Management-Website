# Project Management Website

A simple project and task tracking app built with Express, MongoDB/Mongoose, JWT authentication, and a static HTML/CSS/JS frontend.

## Requirements

- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string

index.html

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from the template:

   ```bash
   copy .env.example .env
   ```

3. Edit `.env` and set:

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/project-management
   JWT_SECRET=replace-with-a-long-random-secret
   PORT=5000
   ```

4. Start the app:

   ```bash
   npm start
   ```

5. Open the app through the Express server, not by double-clicking the HTML file:

   ```text
   http://localhost:5000
   ```

## Notes

- Do not open `public/index.html` directly from File Explorer. Login/signup need the backend API, so use `http://localhost:5000`.
- Project and task API routes enforce project ownership/member access.
- `seed.js` clears the database before creating a test user, so only run it intentionally.
