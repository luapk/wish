#!/usr/bin/env bash
# One-shot deploy script — run this from your local machine inside the repo root.
# Fill in your credentials below before running.
# Requires: Python 3.10+, pip

set -e

MODAL_TOKEN_ID="YOUR_MODAL_TOKEN_ID"
MODAL_TOKEN_SECRET="YOUR_MODAL_TOKEN_SECRET"
ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY"
HUGGINGFACE_TOKEN="YOUR_HUGGINGFACE_TOKEN"

echo "==> Installing Modal CLI..."
pip install modal -q

echo "==> Authenticating Modal..."
modal token set --token-id "$MODAL_TOKEN_ID" --token-secret "$MODAL_TOKEN_SECRET"

echo "==> Creating Modal secrets..."
modal secret create anthropic-secret ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" --force
modal secret create huggingface-secret HUGGINGFACE_TOKEN="$HUGGINGFACE_TOKEN" --force

echo "==> Deploying Modal backend (builds Docker image — ~3 min first time)..."
modal deploy modal_backend/app.py

echo ""
echo "=========================================================="
echo "  Deploy complete!"
echo "  Copy the two endpoint URLs above into .env.local:"
echo "    MODAL_ANALYZE_URL=https://YOUR_WORKSPACE--cognitive-analyzer-analyze.modal.run"
echo "    MODAL_STATUS_URL=https://YOUR_WORKSPACE--cognitive-analyzer-status.modal.run"
echo "=========================================================="
