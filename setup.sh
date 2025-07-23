#!/bin/bash

# Hotel Diplomat Software - Development Setup Script
# This script helps new collaborators set up the development environment

echo "🏨 Hotel Diplomat Software - Development Setup"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating environment file..."
    cp env.example .env.local
    echo "✅ Environment file created (.env.local)"
    echo "   Please edit .env.local with your configuration"
else
    echo "✅ Environment file already exists"
fi

# Check if Git is installed
if command -v git &> /dev/null; then
    echo "✅ Git is installed"
    
    # Check if this is a Git repository
    if [ -d .git ]; then
        echo "✅ Git repository initialized"
        
        # Check remote origin
        if git remote get-url origin &> /dev/null; then
            echo "✅ Remote origin configured: $(git remote get-url origin)"
        else
            echo "⚠️  No remote origin configured"
        fi
    else
        echo "⚠️  This directory is not a Git repository"
    fi
else
    echo "⚠️  Git is not installed. Consider installing Git for version control."
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your configuration"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "Happy coding! 🚀" 