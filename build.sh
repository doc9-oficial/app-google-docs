#!/bin/bash
set -e

echo "🔨 Building GDocs App..."
rm -rf dist/
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo "⚙️ Compiling TypeScript..."
npx tsc

echo "✅ Build completed!"
