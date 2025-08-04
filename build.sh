#!/bin/bash

# Install dependencies
npm install

# Build the frontend
npm run build

# Install backend dependencies
cd backend
npm install

# Go back to root
cd ..

echo "Build completed successfully!" 