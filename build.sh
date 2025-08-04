#!/bin/bash

# Railway Build Script for Hotel Management System
echo "🚀 Starting Railway build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the frontend
echo "🔨 Building frontend..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    exit 0
else
    echo "❌ Build failed!"
    exit 1
fi 