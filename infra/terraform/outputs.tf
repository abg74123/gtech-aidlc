# =============================================================================
# Outputs
# =============================================================================

# --- Networking ---

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

# --- Database ---

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_db_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

# --- ECR ---

output "ecr_repository_url" {
  description = "ECR repository URL for API image"
  value       = aws_ecr_repository.api.repository_url
}

# --- ECS ---

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.api.name
}

# --- ALB ---

output "alb_dns_name" {
  description = "ALB DNS name (API endpoint)"
  value       = aws_lb.api.dns_name
}

# --- CloudFront ---

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain (Web app URL)"
  value       = aws_cloudfront_distribution.web.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.web.id
}

# --- S3 ---

output "web_bucket_name" {
  description = "S3 bucket name for Angular SPA"
  value       = aws_s3_bucket.web.id
}

# --- Useful URLs ---

output "app_url" {
  description = "Application URL"
  value       = "https://${aws_cloudfront_distribution.web.domain_name}"
}

output "api_url" {
  description = "API URL (via CloudFront)"
  value       = "https://${aws_cloudfront_distribution.web.domain_name}/api/v1"
}

output "api_direct_url" {
  description = "API URL (direct ALB)"
  value       = "http://${aws_lb.api.dns_name}/api/v1"
}
