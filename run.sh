#!/bin/bash
# Replit Startup script for SmartBlinks AI

echo "Initializing SmartBlinks AI Autonomous Core Node..."

if [ -f "server.ts" ]; then
    echo "Running Node.js full-stack container on Port 8000 (mapped from 3000)..."
    # Ensure dependencies are loaded
    npm run build
    npm run start
else
    echo "Booting FastAPI python core on Port 8000..."
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000
fi
