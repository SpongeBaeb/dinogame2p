#!/bin/bash

# Deployment Script for Runner vs Attacker

echo "=========================================="
echo "🚀 Starting Automated Deployment"
echo "=========================================="

# 1. Navigate to project directory
# Adjust this path if your project is in a different location
PROJECT_DIR="$HOME/dinogame2p"

if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    echo "📂 Navigated to $PROJECT_DIR"
else
    echo "❌ Error: Project directory $PROJECT_DIR not found!"
    exit 1
fi

# 2. Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull
if [ $? -ne 0 ]; then
    echo "❌ Git pull failed!"
    exit 1
fi

# 3. Install dependencies
echo "📦 Checking/Installing dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "❌ npm install failed!"
    exit 1
fi

# 4. Restart Server
echo "🔄 Restarting Server..."

# Find and kill the running server process
# This looks for 'node server.js' specifically
PID=$(pgrep -f "node server.js")

if [ ! -z "$PID" ]; then
    echo "🛑 Stopping existing server (PID: $PID)..."
    kill $PID
    sleep 2 # Wait for it to close
else
    echo "ℹ️ No running server found."
fi

# Start server in background using nohup
# Output is redirected to server.log
echo "▶️ Starting new server instance..."
nohup node server.js > server.log 2>&1 &

echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo "Server is running in the background."
echo "To check logs: tail -f ~/dinogame2p/server/server.log"
