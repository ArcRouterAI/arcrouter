# Contributing to arcrouter-classifier

## Getting Started

```bash
git clone https://github.com/ArcRouterAI/arcrouter
cd arcrouter
npm install
npm run build
npm test
```

## What's in Scope

This repo contains the **classifier layer only** — pure TypeScript with zero runtime dependencies:

- `src/scorer.ts` — complexity scoring and agentic detection
- `src/budget.ts` — budget tier normalization
- `src/compression.ts` — lossless message compression
- `src/types.ts` — shared types

**Out of scope:** semantic routing, model ranking, benchmark scoring, council consensus, API endpoints. Those are in the private ArcRouter infrastructure.

## Making Changes

- All changes must pass `npm test` and `npm run lint`
- New features should include tests in `tests/`
- Classifier patterns (regexes) should have test coverage for the use case that motivated them
- Keep zero runtime dependencies — this is intentional

## Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b fix/science-detection`)
3. Make changes with tests
4. Run `npm test && npm run build`
5. Open a PR with a clear description of what changed and why

## Reporting Issues

Open an issue on GitHub. For security issues, see SECURITY.md.
