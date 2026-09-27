# GenAI app on AWS Bedrock

**Target week 10. Must be shipped by week 11.**
Local source: `/home/hitesh/hitesh/projects/AI-Data_Cleaning_Chatbot`

## Why this is the differentiator

An eval harness with numbers is what separates an AI engineer from a prompt
hobbyist. Most applicants will show a demo. You will show a **scorecard**: a
table of accuracy, latency and cost-per-query, with history, that caught a
regression you shipped.

You already have a working FastAPI + LangChain + Gemini data-cleaning chatbot.
Porting it to Bedrock gives you a genuine before/after story instead of a
greenfield build.

## Architecture

```
React UI
  |  streaming
API Gateway (HTTP API)
  |
Lambda (Python 3.12)  --IAM scoped to exactly one Bedrock model-->
  Amazon Bedrock (Claude)  --embeddings-->
  vector store in S3            |
  |                             +--> CloudWatch: latency p50/p95, tokens, errors
  +--> S3: source documents, eval results, run history
```

## Milestones

| # | Week | Milestone | Done |
|---|---:|---|---|
| gi-1 | 9 | **Eval set first.** 50-100 Q&A pairs with expected answers, written *before* the pipeline. This is the project. | [ ] |
| gi-2 | 9 | Bedrock model call from Lambda, streaming on, IAM scoped to one model | [ ] |
| gi-3 | 10 | S3 ingestion: extract, chunk, embed. Log your chunk sizes. | [ ] |
| gi-4 | 10 | RAG endpoint + React UI, streaming to the browser | [ ] |
| gi-5 | 10 | Eval harness runs, scorecard visible, history stored | [ ] |
| gi-6 | 11 | Prompt-injection and guardrails pass. Show the attack and the defence. | [ ] |
| gi-7 | 11 | Cost model and budget alarm: tokens per query, monthly projection | [ ] |
| gi-8 | 11 | Write-up and portfolio entry: architecture, eval table, the failures | [ ] |

## The eval harness is the deliverable

Store, per run: `run_id`, model, prompt version, chunk config, accuracy,
p50/p95 latency, tokens in/out, cost. Never change a prompt or a chunk size
without a new row. That is the whole point.

**First thing to expect:** your initial retrieval will be bad, and chunk size
will be the cause. Keep that failure, write it up, and publish it. It is
better interview material than a smooth demo.

## Interview questions this project answers

- How do you know whether a prompt change made things better or worse?
- Chunking strategy, and what happens when retrieval fails.
- How do you keep a RAG app inside a token budget?
- Where do prompt-injection defences actually go?
- Why Bedrock instead of calling a model API directly?

## Before you start

`AI-Data_Cleaning_Chatbot` has its origin pointed at another user's GitHub
account. Fix that first, or this project is not a portfolio piece. See
[../preflight.md](../preflight.md).
