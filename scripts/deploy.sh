#!/usr/bin/env bash

echo "Jedziemy"

set -e

ENVIRONMENT="$1"

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: ./scripts/deploy.sh <dev|uat|prod>"
  exit 1
fi

case "$ENVIRONMENT" in
  dev|uat|prod)
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    exit 1
    ;;
esac

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$ENVIRONMENT" = "prod" ] && [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Production deployment is allowed only from main branch"
  exit 1
fi

echo "========================================"
echo "Current branch : $CURRENT_BRANCH"
echo "Target env     : $ENVIRONMENT"
echo "========================================"

echo
echo "Building TypeScript..."

npm run build

echo
echo "Creating deployment package..."

rm -f notifications-handler.zip

cd build

zip -r notifications-handler.zip . -x notifications-handler.zip

cd ..

echo
echo "Running Terraform..."

terraform -chdir=terraform/environments/$ENVIRONMENT init

terraform -chdir=terraform/environments/$ENVIRONMENT apply

echo
echo "Deployment finished successfully"
