#!/usr/bin/env bash
# Quick health check for VPS deployment.
# Usage: bash deploy/verify-deployment.sh [base-url]

set -euo pipefail

BASE_URL="${1:-http://hoshmandsafi.com}"

echo "Checking backend directly (port 8000)..."
curl -fsS "http://127.0.0.1:8000/api/health" | head -c 200
echo

echo "Checking CSRF through nginx (${BASE_URL})..."
curl -fsS "${BASE_URL}/api/auth/csrf" | head -c 200
echo

echo "Checking health through nginx (${BASE_URL})..."
curl -fsS "${BASE_URL}/api/health" | head -c 200
echo

echo "All checks passed."
