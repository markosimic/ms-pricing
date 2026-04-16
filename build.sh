#!/usr/bin/env bash
# build.sh — Docker build helper for ms-pricing
# Runs docker build, saves output to build.log so errors can be inspected.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG="$SCRIPT_DIR/build.log"

# ── Resolve ACR URL ──────────────────────────────────────────────────────────
if [[ -z "${ACR_URL:-}" ]]; then
  ACR_NAME="${ACR_NAME:-}"
  if [[ -z "$ACR_NAME" ]]; then
    echo "ERROR: Set ACR_NAME or ACR_URL before running this script."
    echo "  export ACR_NAME=mspricingacr   # replace with your ACR name"
    exit 1
  fi
  ACR_URL=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
fi

VERSION="${IMAGE_VERSION:-v26}"
IMAGE="$ACR_URL/ms-pricing:$VERSION"

echo "Building: $IMAGE"
echo "Log:      $LOG"
echo ""

# ── ACR login ────────────────────────────────────────────────────────────────
echo "Logging in to ACR..."
az acr login --name "$ACR_NAME"

# ── Docker build ─────────────────────────────────────────────────────────────
if docker build --no-cache --platform linux/amd64 -t "$IMAGE" . 2>&1 | tee "$LOG"; then
  echo ""
  echo "✓ Build succeeded: $IMAGE"
  echo ""

  # ── Push ───────────────────────────────────────────────────────────────────
  echo "Pushing image to ACR..."
  docker push "$IMAGE" && echo "✓ Push succeeded."
else
  echo ""
  echo "✗ Build failed. Errors saved to: $LOG"
  echo "  Share the contents of build.log to get the next fix."
  exit 1
fi
