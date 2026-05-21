# Autoflow — AWS Infrastructure

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CloudFront CDN                              │
│                    (Angular SPA + API proxy)                         │
└──────────────┬──────────────────────────────────┬───────────────────┘
               │ /api/*                           │ /*
               ▼                                  ▼
┌──────────────────────────┐         ┌────────────────────────────┐
│   Application Load       │         │        S3 Bucket           │
│   Balancer (ALB)         │         │   (Angular static files)   │
└──────────┬───────────────┘         └────────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│   ECS Fargate Cluster    │
│   ┌──────────────────┐   │
│   │  NestJS API (x2) │   │
│   └──────────────────┘   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│   RDS PostgreSQL 16      │
│   (Multi-AZ, encrypted)  │
└──────────────────────────┘
```

## Components

| Component | AWS Service | Purpose |
|-----------|-------------|---------|
| Frontend | S3 + CloudFront | Angular SPA hosting with global CDN |
| API | ECS Fargate + ALB | NestJS containerized API with auto-scaling |
| Database | RDS PostgreSQL 16 | Managed PostgreSQL with Multi-AZ |
| Container Registry | ECR | Docker image storage |
| Secrets | Secrets Manager | DATABASE_URL, JWT_SECRET |
| Networking | VPC | Isolated network with public/private subnets |

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.5.0
3. **Docker** for building API images
4. **Node.js** 20+ for building the Angular app

## Quick Start

### 1. Configure Variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 2. Initialize & Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### 3. Deploy API

```bash
# From project root
chmod +x infra/scripts/deploy-api.sh
./infra/scripts/deploy-api.sh production
```

### 4. Deploy Web

```bash
chmod +x infra/scripts/deploy-web.sh
./infra/scripts/deploy-web.sh production
```

## Database Initialization

After the first deployment, you need to initialize the database schemas:

```bash
# Connect to the RDS instance via a bastion or ECS exec
# Then run the schema initialization
psql -h <rds-endpoint> -U autoflow -d autoflow -f scripts/init-schemas.sql
```

Alternatively, the API container runs `prisma migrate deploy` on startup, which handles migrations automatically.

## Deployment Scripts

| Script | Purpose |
|--------|---------|
| `infra/scripts/deploy-api.sh` | Build Docker image, push to ECR, update ECS |
| `infra/scripts/deploy-web.sh` | Build Angular, sync to S3, invalidate CloudFront |

## Terraform Outputs

After `terraform apply`, you'll get:

- `app_url` — Full application URL (CloudFront)
- `api_url` — API URL via CloudFront
- `api_direct_url` — Direct ALB URL for API
- `ecr_repository_url` — ECR repo for pushing images
- `cloudfront_distribution_id` — For cache invalidation

## Cost Estimation (ap-southeast-1)

| Resource | Estimated Monthly Cost |
|----------|----------------------|
| ECS Fargate (2 tasks, 0.5 vCPU, 1GB) | ~$30 |
| RDS db.t3.medium (Multi-AZ) | ~$70 |
| ALB | ~$20 |
| NAT Gateway | ~$35 |
| CloudFront | ~$5-20 (traffic dependent) |
| S3 | < $1 |
| **Total** | **~$160-175/month** |

For dev/staging, use single-AZ RDS and 1 ECS task to reduce costs to ~$80/month.

## Security

- RDS is in private subnets (no public access)
- ECS tasks run in private subnets behind NAT
- All secrets stored in AWS Secrets Manager
- S3 bucket is private (CloudFront OAC only)
- Security groups follow least-privilege principle
- Storage encryption enabled on RDS and S3

## Scaling

- ECS auto-scales based on CPU utilization (target: 70%)
- RDS storage auto-scales up to configured maximum
- CloudFront handles frontend scaling automatically

## HTTPS / Custom Domain

To add a custom domain:

1. Set `domain_name` in terraform.tfvars
2. Create an ACM certificate in us-east-1 (for CloudFront)
3. Uncomment the HTTPS listener in `alb.tf`
4. Add the domain to CloudFront aliases
5. Create Route53 records pointing to CloudFront/ALB
