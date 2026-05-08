#!/bin/bash

set -e

echo ""
echo "========================================"
echo "Building Lambda artifact"
echo "========================================"
echo ""

npm run build

echo ""
echo "========================================"
echo "Terraform init (PROD)"
echo "========================================"
echo ""

terraform -chdir=terraform/environments/prod init

echo ""
echo "========================================"
echo "Terraform apply (PROD)"
echo "========================================"
echo ""

terraform -chdir=terraform/environments/prod apply