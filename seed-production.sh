#!/bin/bash

# Production Database Seeding Script
# Run this after first deployment to create admin user and sample data

echo "🌱 Seeding production database..."
echo ""
echo "Make sure you have the production DATABASE_URL set."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Usage:"
    echo "  DATABASE_URL='your-production-db-url' ./seed-production.sh"
    echo ""
    exit 1
fi

# Run seed script
npm run db:seed

echo ""
echo "✅ Production database seeded!"
echo ""
echo "You can now login at your Vercel URL with:"
echo "  Email: \$ADMIN_EMAIL"
echo "  Password: \$ADMIN_PASSWORD"
echo ""

