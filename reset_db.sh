#!/bin/bash

echo "=========================================="
echo "⚠️  Runner vs Attacker - Database Reset"
echo "=========================================="
echo "This will DELETE ALL DATA in the database."
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "🚫 Operation cancelled."
    exit 1
fi

echo "🔄 Resetting database..."
cd server
node scripts/reset-db.js

if [ $? -eq 0 ]; then
    echo "=========================================="
    echo "✅ Database has been reset."
    echo "=========================================="
else
    echo "❌ Database reset failed."
    exit 1
fi
