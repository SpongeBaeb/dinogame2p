# Quick Start Guide

## Prerequisites
1. **Node.js** - Install from https://nodejs.org (LTS version recommended)
2. **PostgreSQL** - Install from https://www.postgresql.org/download/

## Step-by-Step Setup

### 1. Install PostgreSQL and Create Database

After installing PostgreSQL, open SQL shell (psql) and run:
```sql
CREATE DATABASE runner_game;
```

### 2. Configure Server Environment

Navigate to the server folder and copy the example environment file:
```bash
cd server
copy .env.example .env
```

Open `.env` in a text editor and update with your PostgreSQL password:
```
DB_PASSWORD=your_postgresql_password_here
```

### 3. Install Dependencies

In the `server` folder:
```bash
npm install
```

### 4. Start the Server

```bash
npm start
```

You should see:
```
✅ Database connected successfully
✅ Database tables initialized
🚀 Server running on port 3000
```

### 5. Test the Application

Open your browser and navigate to:
```
file:///C:/Users/stebe/OneDrive/바탕 화면/Runner-20251128/login.html
```

Or use a local web server (recommended):
```bash
# Install http-server globally
npm install -g http-server

# Run from the game directory
cd ..
http-server -p 8080
```

Then visit: http://localhost:8080/register.html

## Troubleshooting

**Database connection error?**
- Check if PostgreSQL is running
- Verify the password in `.env` matches your PostgreSQL password
- Ensure the database `runner_game` exists

**CORS error?**
- If using file://, the browser may block requests
- Use http-server instead
- Update `FRONTEND_URL` in `.env` if using a different port

**Can't find npm?**
- Make sure Node.js is installed
- Restart your terminal after installing Node.js

## Next Steps

After the server is running:
1. Register a new account at `/register.html`
2. Login at `/login.html`
3. Play the game and scores will be saved automatically!

For GCP deployment, see `server/README.md`.
