# AccoSpark on AWS

**Target week 8. Must be shipped and demoable by week 10.**
Local source: `/home/hitesh/hitesh/projects/AccoSpark`

## Why this is the flagship

A 18.9k-line Laravel 12 app with 10 passing tests, real auth, an Overwatch
module and a working AI service. Almost nobody applying for a junior cloud role
has a production-shaped application to point at. Deploying *this* proves you can
both write software and operate it, which is the actual job description.

## Architecture

```
Browser
  |  HTTPS (ACM cert, auto-renewing)
Route 53
  |
CloudFront  ---- origin ---->  S3 (private, OAC) for static + user media
  |
Elastic Beanstalk (Laravel, PHP 8.2) in private subnets
  |  SSM Session Manager        (no SSH keys at all)
  |  Secrets Manager            (DB password, Google OAuth, OpenRouter key)
  |  CloudWatch -> SNS alarms   (CPU, disk, custom error-rate metric)
  +----> RDS MySQL 8            (private, encrypted, automated backups)

Everything created by CloudFormation. One stack delete = back to INR 0.
```

## Milestones

| # | Week | Milestone | Done |
|---|---:|---|---|
| as-1 | 1 | AWS account hardened: root MFA, IAM user, budget alarm at INR 500, region `ap-south-1` | [ ] |
| as-2 | 2 | Architecture Decision Record: one page, why each service, what it costs | [ ] |
| as-3 | 6 | Deploy to EC2 via user-data. No IaC yet. | [ ] |
| as-4 | 6 | RDS MySQL: private subnet, SG, encrypted, automated backups | [ ] |
| as-5 | 7 | S3 + CloudFront, origin access control so the bucket stays private | [ ] |
| as-6 | 7 | Route 53 + ACM TLS on a custom domain, HTTP redirect | [ ] |
| as-7 | 7 | SSM Session Manager, then revoke the SSH keys and prove you can still get in | [ ] |
| as-8 | 7 | Secrets Manager: move the four secrets out of `.env` | [ ] |
| as-9 | 8 | CloudWatch: CPU, disk, custom error-rate metric, alarms wired to SNS | [ ] |
| as-10 | 8 | GitHub Actions: push to main runs tests then deploys, manual approval gate | [ ] |
| as-11 | 8 | CloudFormation for the whole stack | [ ] |
| as-12 | 10 | Load test and cost snapshot: req/s, p95 latency, monthly estimate | [ ] |
| as-13 | 10 | README, architecture diagram, live demo | [ ] |

## Cost ceiling

Budget alarm at **INR 500/month**. Services that can quietly eat that:

- NAT Gateway, ~$32/month. Avoid it, or accept it deliberately and say so in the ADR.
- RDS free tier allocation is unreliable. Prefer `t3.micro` and delete it when idle.
- Data transfer out past 15 GB/month.
- Lightsail $5/month is the escape hatch if the free-tier credits run out.

## Interview questions this project answers

- Why Elastic Beanstalk over plain EC2, and over Lambda for a stateful Laravel app?
- How would you do zero-downtime deploys and rollbacks?
- Where do secrets live, and how do you rotate them?
- What are your RTO and RPO, and what would change them?
- How do you keep the monthly bill under control?
