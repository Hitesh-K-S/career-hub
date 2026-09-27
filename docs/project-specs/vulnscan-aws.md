# VulnScan on AWS

**Target week 11. Ship by week 12. Optional.**
Local source: **not found.** GitHub: `https://github.com/Hitesh-K-S/vulnscan`

## Blocked: find it first

Your resume lists VulnScan. The disk does not have it. Either the repo is not
cloned, or the project was never pushed.

Before week 10, decide which:

1. **Clone the existing repo** and work from that.
2. **Rebuild a minimal version** - a Python scanner that checks TLS config,
   HTTP security headers and CORS policy, driven by a target list, emitting JSON
   findings. That is a weekend, and it is genuinely useful.

Milestone `vs-0` is a hard blocker on the rest of this project.

## Architecture

```
POST /scan  ->  API Gateway  ->  Lambda (Python)
  |                                 |
  |                                 +--> S3 report per target (HTML + JSON)
  +--> job_id  ->  DynamoDB findings, queryable by severity
```

## Milestones

| # | Week | Milestone | Done |
|---|---:|---|---|
| vs-0 | 10 | Locate or rebuild VulnScan | [ ] |
| vs-1 | 11 | Lambda + API Gateway wrapper, returns a job id | [ ] |
| vs-2 | 11 | S3 reports + DynamoDB findings | [ ] |
| vs-3 | 12 | Write up a real finding from your own projects | [ ] |

## The honest engineering caveat

Serverless is a poor fit for long-running network scans: Lambda caps at 15
minutes and outbound connections are awkward from a VPC-attached function. Two
acceptable answers:

- Keep the scan under 15 minutes and say that is a deliberate constraint.
- Use ECS Fargate for the scanning, Lambda only for the API layer.

Either answer is a better interview story than pretending the first works.

## The free win

You already found a **permissive CORS misconfiguration** in your own
`AccoSpark` project. That is a real finding, in your own code, that you already
wrote up. Publish it properly in week 12. It connects your security resume
variant to your cloud pivot with zero extra work.

## Interview questions this project answers

- What can and can you legally scan?
- How do you rate severity, and how do you keep false-positive noise down?
- Serverless is a bad fit for long scans - what did you do about it?
- How do you stop your own scanner being used against someone else's systems?
