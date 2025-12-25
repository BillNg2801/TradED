#!/bin/bash

# FinEdu Startup Script
# This script starts both the frontend and backend servers

echo "🚀 Starting FinEdu..."

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

# Start frontend server in background
echo "▶️  Starting frontend server on port 8000..."
python3 -m http.server 8000 > /dev/null 2>&1 &
FRONTEND_PID=$!

# Start backend server in background
echo "▶️  Starting backend server on port 3000..."
cd backend
node server.js > /dev/null 2>&1 &
BACKEND_PID=$!
cd ..

echo ""
echo "✅ FinEdu is running!"
echo ""
echo "📱 Open this URL in your browser:"
echo "   http://localhost:8000/backend/index.html"
echo ""
echo "⏹  To stop the servers, press Ctrl+C"
echo ""

# Wait for user to press Ctrl+C
trap "echo ''; echo '⏹  Stopping servers...'; kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; echo '✅ Stopped'; exit" INT

# Keep script running
wait



