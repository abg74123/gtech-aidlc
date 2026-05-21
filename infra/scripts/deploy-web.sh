#!/bin/bash
set -euo pipefail

# =============================================================================
# deploy-web.sh — Build and deploy Angular SPA to S3 + CloudFront
# =============================================================================
# Usage: ./infra/scripts/deploy-web.sh [environment]
# Example: ./infra/scripts/deploy-web.sh production

ENVIRONMENT="${1:-production}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"

echo "🚀 Deploying Autoflow Web to ${ENVIRONMENT}..."

# --- Get Terraform outputs ---
cd infra/terraform

S3_BUCKET=$(terraform output -raw web_bucket_name)
CF_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)

cd ../..

# --- Build Angular app ---
echo "🏗️  Building Angular app..."
npx nx build web --configuration=production

# --- Sync to S3 ---
echo "📤 Uploading to S3..."
aws s3 sync dist/apps/web/browser "s3://${S3_BUCKET}" \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --region "${AWS_REGION}"

# Upload index.html with no-cache (SPA entry point must always be fresh)
aws s3 cp dist/apps/web/browser/index.html "s3://${S3_BUCKET}/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html" \
  --region "${AWS_REGION}"

# --- Invalidate CloudFront cache ---
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "${CF_DISTRIBUTION_ID}" \
  --paths "/index.html" "/*" \
  > /dev/null

echo "✅ Web deployment complete!"
echo "   Bucket: ${S3_BUCKET}"
echo "   CloudFront: ${CF_DISTRIBUTION_ID}"
