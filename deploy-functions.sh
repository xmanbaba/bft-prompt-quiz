#!/usr/bin/env bash
set -euo pipefail

VPS_HOST="191.215.37.28"
VPS_USER="root"
VPS_FUNCTIONS_PATH="~/supabase/docker/volumes/functions"
COMPOSE_DIR="~/supabase/docker"

echo "Copying supabase/functions/* to $VPS_USER@$VPS_HOST:$VPS_FUNCTIONS_PATH ..."
scp -r supabase/functions/score-mcq supabase/functions/score-response \
  "$VPS_USER@$VPS_HOST:$VPS_FUNCTIONS_PATH/"

echo "Restarting the functions container..."
ssh "$VPS_USER@$VPS_HOST" "cd $COMPOSE_DIR && docker compose restart functions"

echo "Done. Tail logs with:"
echo "  ssh $VPS_USER@$VPS_HOST 'cd $COMPOSE_DIR && docker compose logs -f functions'"
