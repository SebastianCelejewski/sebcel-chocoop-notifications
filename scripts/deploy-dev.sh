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
echo "Terraform init (DEV)"
echo "========================================"
echo ""

terraform -chdir=terraform/environments/dev init

echo ""
echo "========================================"
echo "Terraform apply (DEV)"
echo "========================================"
echo ""

terraform -chdir=terraform/environments/dev apply