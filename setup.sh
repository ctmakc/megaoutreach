#!/bin/bash

set -e

echo "🚀 Setting up Outreach AI..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env from example if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your credentials before continuing!"
    exit 0
fi

# Create necessary directories
mkdir -p backend/src frontend/src

# Start services
echo "🐳 Starting Docker services..."
docker compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "📊 Running database migrations..."
docker compose exec backend npm run db:migrate

# Seed initial data
echo "🌱 Seeding initial data..."
docker compose exec backend npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "📍 Services:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:3000"
echo "   Database:  localhost:5432"
echo ""
echo "📚 Next steps:"
echo "   1. Edit .env with your API keys"
echo "   2. Open http://localhost:5173"
echo "   3. Create your first campaign!"
