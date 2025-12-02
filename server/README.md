# Runner Game Server

Backend server for Runner vs Attacker game with authentication and leaderboard.

## Setup Instructions

### 1. Install PostgreSQL
Download and install PostgreSQL from https://www.postgresql.org/download/

### 2. Create Database
```sql
CREATE DATABASE runner_game;
```

### 3. Configure Environment
Copy `.env.example` to `.env` and update the values:
```bash
cp .env.example .env
```

Edit `.env` with your actual database credentials.

### 4. Install Dependencies
```bash
cd server
npm install
```

### 5. Start Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will automatically create the necessary database tables on first run.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
  - Body: `{ username, email, password }`
  - Returns: JWT token + user info

- `POST /api/auth/login` - Login user
  - Body: `{ email, password }`
  - Returns: JWT token + user info

### Leaderboard
- `GET /api/leaderboard?limit=100&mode=all` - Get leaderboard
  - Query params: `limit` (default 100), `mode` (all/single/multiplayer)
  - Returns: Top scores with usernames

- `POST /api/leaderboard/submit` - Submit score (requires authentication)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ score, gameMode, roundSurvived }`
  - Returns: New score + rank

- `GET /api/leaderboard/stats` - Get user stats (requires authentication)
  - Headers: `Authorization: Bearer <token>`
  - Returns: Best score + rank

## Testing

Test the server using curl or Postman:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Get leaderboard
curl http://localhost:3000/api/leaderboard
```

## GCP Deployment

1. Create VM instance on GCP
2. Install Node.js and PostgreSQL
3. Clone repository
4. Configure `.env` with production values
5. Run `npm install`
6. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js
   pm2 startup
   pm2 save
   ```

## Security Notes

- Change `JWT_SECRET` in production to a strong random value
- Use HTTPS in production
- Configure CORS to only allow your frontend domain
- Consider rate limiting for API endpoints
