# =============================================================================
# Autoflow — AWS Infrastructure (Terraform)
# =============================================================================
# Architecture:
#   - VPC with public/private subnets across 2 AZs
#   - RDS PostgreSQL 16 in private subnets
#   - ECS Fargate (NestJS API) in private subnets behind ALB
#   - S3 + CloudFront (Angular SPA)
#   - ECR for container images
#   - Secrets Manager for sensitive configuration
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment and configure for remote state
  # backend "s3" {
  #   bucket         = "autoflow-terraform-state"
  #   key            = "infra/terraform.tfstate"
  #   region         = "ap-southeast-1"
  #   dynamodb_table = "autoflow-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "autoflow"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Secondary provider for CloudFront ACM certificate
provider "aws" {
  alias  = "ap-southeast-1"
  region = "ap-southeast-1"
}

# =============================================================================
# Data Sources
# =============================================================================

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}
