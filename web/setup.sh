#!/bin/bash

# Browser Automation Platform Web Setup Script
# This script helps set up the web interface for the browser automation platform

set -e

echo "🚀 Setting up Browser Automation Platform - Web Interface"
echo "============================================================"

# Check if we're in the web directory
if [[ ! -f "package.json" ]]; then
  echo "❌ Error: This script must be run from the web/ directory"
  echo "   Please run: cd web && ./setup.sh"
  exit 1
fi

# Check Node.js version
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js 18+ first."
  exit 1
fi

NODE_VERSION=$(node --version | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js version 18+ is required. Current version: $(node --version)"
  exit 1
fi
echo "✅ Node.js version: $(node --version)"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "⚠️  PostgreSQL client not found. Make sure PostgreSQL is installed and accessible."
  echo "   You can install it with:"
  echo "   - macOS: brew install postgresql"
  echo "   - Ubuntu: sudo apt-get install postgresql postgresql-contrib"
else
  echo "✅ PostgreSQL client found"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

# Set up environment file
echo ""
echo "⚙️  Setting up environment configuration..."
if [ ! -f ".env.local" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local from .env.example"
  else
    echo "❌ .env.example file not found"
    exit 1
  fi
else
  echo "ℹ️  .env.local already exists, skipping..."
fi

# Prompt for database URL if not set
if ! grep -q "^DATABASE_URL=" .env.local || grep -q "^DATABASE_URL=\"postgresql://username:password" .env.local; then
  echo ""
  echo "🗄️  Database Configuration"
  echo "Please enter your PostgreSQL connection details:"
  
  read -p "Database host (localhost): " DB_HOST
  DB_HOST=${DB_HOST:-localhost}
  
  read -p "Database port (5432): " DB_PORT
  DB_PORT=${DB_PORT:-5432}
  
  read -p "Database name: " DB_NAME
  while [[ -z "$DB_NAME" ]]; do
    read -p "Database name (required): " DB_NAME
  done
  
  read -p "Database username: " DB_USER
  while [[ -z "$DB_USER" ]]; do
    read -p "Database username (required): " DB_USER
  done
  
  read -s -p "Database password: " DB_PASS
  echo ""
  
  DATABASE_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME"
  
  # Update .env.local
  if grep -q "^DATABASE_URL=" .env.local; then
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env.local
  else
    echo "DATABASE_URL=\"$DATABASE_URL\"" >> .env.local
  fi
  
  echo "✅ Database URL configured"
fi

# Prompt for OpenAI API key if not set
if ! grep -q "^OPENAI_API_KEY=" .env.local || grep -q "^OPENAI_API_KEY=\"your_openai_api_key" .env.local; then
  echo ""
  echo "🤖 AI Configuration"
  echo "The platform uses OpenAI GPT-4 for AI-powered features."
  read -p "Enter your OpenAI API key (or press Enter to skip): " OPENAI_KEY
  
  if [[ -n "$OPENAI_KEY" ]]; then
    if grep -q "^OPENAI_API_KEY=" .env.local; then
      sed -i.bak "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=\"$OPENAI_KEY\"|" .env.local
    else
      echo "OPENAI_API_KEY=\"$OPENAI_KEY\"" >> .env.local
    fi
    echo "✅ OpenAI API key configured"
  else
    echo "⚠️  Skipping OpenAI configuration. AI features will be limited."
  fi
fi

# Set up database
echo ""
echo "🗄️  Setting up database..."

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Test database connection and push schema
echo "Testing database connection and pushing schema..."
if npx prisma db push; then
  echo "✅ Database schema deployed successfully"
else
  echo "❌ Database setup failed. Please check your database connection and try again."
  echo "   You can manually run: npx prisma db push"
  exit 1
fi

# Build the application
echo ""
echo "🏗️  Building application..."
if npm run build; then
  echo "✅ Application built successfully"
else
  echo "❌ Build failed. Please check the error messages above."
  exit 1
fi

# Final instructions
echo ""
echo "🎉 Setup completed successfully!"
echo "============================================================"
echo ""
echo "🚀 To start the development server:"
echo "   npm run dev"
echo ""
echo "🌐 The application will be available at:"
echo "   http://localhost:3001"
echo ""
echo "🗄️  To view/manage your database:"
echo "   npx prisma studio"
echo ""
echo "📖 For more information, see the README.md file"
echo ""
echo "💡 Next steps:"
echo "   1. Start the development server with 'npm run dev'"
echo "   2. Open http://localhost:3001 in your browser"
echo "   3. Create your first automation workflow!"
echo ""

# Clean up backup files
rm -f .env.local.bak 2>/dev/null || true
