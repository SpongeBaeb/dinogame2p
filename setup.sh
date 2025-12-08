#!/bin/bash

echo "=========================================="
echo "🛠️  Runner vs Attacker - Project Setup"
echo "=========================================="

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi
echo "✅ Node.js is installed: $(node -v)"

# 2. Install Dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies."
    exit 1
fi
echo "✅ Dependencies installed."

# 3. Setup .env
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your database credentials!"
else
    echo "✅ .env file already exists."
fi

# 4. Initialize Database
echo "🗄️  Initializing database..."
node scripts/init-db.js
if [ $? -ne 0 ]; then
    echo "❌ Database initialization failed."
    exit 1
fi

echo "=========================================="
echo "✅ Setup Complete! You can now run the server."
echo "   Run: cd server && npm start"
echo "=========================================="
