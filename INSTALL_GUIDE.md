# Installation Guide - Prerequisites

## ⚠️ Missing Dependencies Detected

You need to install the following before running the server:

## 1. Node.js (Required)

**Download:** https://nodejs.org/en/download/

Choose the **LTS (Long Term Support)** version.

**Installation Steps:**
1. Download the Windows installer (.msi)
2. Run the installer
3. Follow the setup wizard (keep default settings)
4. Restart your terminal after installation

**Verify installation:**
```bash
node --version
npm --version
```

## 2. PostgreSQL (Required)

**Download:** https://www.postgresql.org/download/windows/

**Installation Steps:**
1. Download the installer
2. Run the installer
3. **IMPORTANT**: Remember the password you set for the 'postgres' user
4. Keep default port (5432)
5. During installation, make sure to install:
   - PostgreSQL Server
   - pgAdmin (graphical tool)
   - Command Line Tools

**Verify installation:**
```bash
psql --version
```

## 3. After Installation

### Create Database

**Option A: Using pgAdmin (Graphical)**
1. Open pgAdmin
2. Connect to PostgreSQL Server
3. Right-click "Databases" → "Create" → "Database"
4. Database name: `runner_game`
5. Click "Save"

**Option B: Using Command Line**
```bash
psql -U postgres
# Enter your PostgreSQL password when prompted

# Then run:
CREATE DATABASE runner_game;
\q
```

### Configure Server

1. Navigate to the server folder:
```bash
cd server
```

2. Copy the env example:
```bash
copy .env.example .env
```

3. Edit `.env` file and update:
```
DB_PASSWORD=your_postgresql_password_here
```

4. Install dependencies:
```bash
npm install
```

5. Start the server:
```bash
npm start
```

## 4. Test the Application

**Option A: Using File Protocol**
Open in browser:
```
file:///C:/Users/stebe/OneDrive/바탕 화면/Runner-20251128/register.html
```

**Option B: Using Local Server (Recommended)**
```bash
# Install http-server globally
npm install -g http-server

# From the game directory (not server folder)
cd ..
http-server -p 8080

# Then visit: http://localhost:8080/register.html
```

## Troubleshooting

**"'node' is not recognized"**
- Restart your terminal/PowerShell after installing Node.js
- Make sure installation completed successfully

**"'psql' is not recognized"**
- During PostgreSQL installation, make sure "Command Line Tools" was selected
- Add PostgreSQL bin folder to PATH manually if needed:
  - Default path: `C:\Program Files\PostgreSQL\16\bin`

**CORS errors in browser**
- Use http-server instead of file:// protocol
- Check that server is running on port 3000

## Quick Command Summary

After everything is installed:

```bash
# 1. Go to server folder
cd C:\Users\stebe\OneDrive\바탕 화면\Runner-20251128\server

# 2. Install dependencies (first time only)
npm install

# 3. Start server
npm start

# 4. In a NEW terminal, go to game folder
cd C:\Users\stebe\OneDrive\바탕 화면\Runner-20251128

# 5. Start web server
http-server -p 8080

# 6. Open browser to http://localhost:8080/register.html
```
