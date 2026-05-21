#!/bin/bash
set -euo pipefail

# =============================================================================
# deploy-api.sh — Build and deploy API to ECS Fargate
# =============================================================================
# Usage: ./infra/scripts/deploy-api.sh [environment]
# Example: ./infra/scripts/deploy-api.sh production

ENVIRONMENT="${1:-production}"
PROJECT_NAME="autoflow"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"

echo "🚀 Deploying Autoflow API to ${ENVIRONMENT}..."

# --- Get Terraform outputs ---
cd infra/terraform

ECR_REPO=$(terraform output -raw ecr_repository_url)
ECS_CLUSTER=$(terraform output -raw ecs_cluster_name)
ECS_SERVICE=$(terraform output -raw ecs_service_name)

cd ../..

# --- Login to ECR ---
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${ECR_REPO%%/*}"

# --- Build Docker image ---
echo "🏗️  Building API Docker image..."
IMAGE_TAG="${ECR_REPO}:$(git rev-parse --short HEAD)"
IMAGE_LATEST="${ECR_REPO}:latest"

docker build \
  -f infra/docker/api.Dockerfile \
  -t "${IMAGE_TAG}" \
  -t "${IMAGE_LATEST}" \
  .

# --- Push to ECR ---
echo "📤 Pushing image to ECR..."
docker push "${IMAGE_TAG}"
docker push "${IMAGE_LATEST}"

# --- Update ECS service (force new deployment) ---
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --force-new-deployment \
  --region "${AWS_REGION}" \
  > /dev/null

echo "⏳ Waiting for deployment to stabilize..."
aws ecs wait services-stable \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}" \
  --region "${AWS_REGION}"

echo "✅ API deployment complete!"
echo "   Image: ${IMAGE_TAG}"
