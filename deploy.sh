#!/bin/sh

echo "install npm dependencies"
npm install --production-only
npm run build
