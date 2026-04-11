# arcrouter-classifier

Fast prompt classifier for LLM routing. Classifies prompts by topic and complexity in <1ms without any LLM calls.

Used internally by [ArcRouter](https://arcrouter.com) to route 345+ models across 24 topic categories.

## Install

```bash
npm install arcrouter-classifier
```

## Quick Start

```typescript
import { scorePrompt, detectTopic, normalizeRoutingBudget } from 'arcrouter-classifier';

// Complexity scoring
const complexity = scorePrompt('Write a binary search tree in TypeScript');
console.log(complexity.tier);       // "COMPLEX"
console.log(complexity.confidence); // 0.92
console.log(complexity.isAgentic);  // false

// Topic detection
const topic = detectTopic('Explain quantum entanglement');
console.log(topic); // "science/physics"

// Budget normalization
console.log(normalizeRoutingBudget('low'));    // "economy"
console.log(normalizeRoutingBudget('medium')); // "auto"
console.log(normalizeRoutingBudget('high'));   // "premium"
```

## API

### `scorePrompt(prompt, hasToolsArray?)`

Classify a prompt into one of four complexity tiers.

```typescript
const result = scorePrompt('Prove that P ≠ NP using a step-by-step argument');

result.tier        // "SIMPLE" | "MEDIUM" | "COMPLEX" | "REASONING"
result.score       // Raw score used to determine tier
result.confidence  // 0-1 sigmoid-calibrated confidence
result.isAgentic   // true if tools[] present or agentic keywords detected
result.reason      // Human-readable explanation
```

**Tiers:**
| Tier | Threshold | Typical prompts |
|------|-----------|-----------------|
| `SIMPLE` | score ≤ 12 | "What is X?", single-word lookups |
| `MEDIUM` | 12 < score ≤ 35 | Explanations, comparisons, how-to guides |
| `COMPLEX` | score > 35 | Code, math, long analysis |
| `REASONING` | COMPLEX + ≥2 reasoning markers | Proofs, step-by-step derivations, trade-off analysis |

### `detectTopic(prompt)`

Detect the topic category using two-pass detection (top-level then subcategory).

```typescript
detectTopic('Debug this React useEffect hook')
// → "code/debugging"

detectTopic('Calculate the integral of e^x from 0 to 1')
// → "math/calculus"

detectTopic('What are the symptoms of COVID-19?')
// → "science/medicine"
```

**Categories:**
- `code` / `code/frontend` / `code/backend` / `code/algorithms` / `code/devops` / `code/security` / `code/debugging`
- `math` / `math/calculus` / `math/algebra` / `math/statistics` / `math/discrete`
- `science` / `science/physics` / `science/chemistry` / `science/biology` / `science/medicine`
- `writing` / `writing/creative` / `writing/technical` / `writing/business` / `writing/academic`
- `reasoning` / `reasoning/logical` / `reasoning/multistep`
- `general`

### `detectTopicDetailed(prompt)`

Returns both primary and secondary categories with confidence scores.

```typescript
const result = detectTopicDetailed('Fix the authentication bug in my Express middleware');
result.primary    // "code"
result.secondary  // "code/security"
result.confidence // 0.8
```

### `normalizeRoutingBudget(raw?)`

Normalize any budget string to a canonical tier.

```typescript
normalizeRoutingBudget('low')     // → "economy"
normalizeRoutingBudget('medium')  // → "auto"
normalizeRoutingBudget('high')    // → "premium"
normalizeRoutingBudget('free')    // → "free"
normalizeRoutingBudget(undefined) // → "auto"
```

### `compressMessages(messages)`

Lossless prompt compression — reduces token count for long conversations.

```typescript
const { messages: compressed, stats } = compressMessages(messages);

stats.original_chars    // e.g. 8420
stats.compressed_chars  // e.g. 7600
stats.saved_chars       // e.g. 820
stats.ratio             // e.g. 0.903 (lower is better)
stats.layers_applied    // e.g. ["L1:dedup", "L2:whitespace"]
```

Compression fires above 5000 chars and applies:
- **L1** — Deduplicates repeated assistant messages
- **L2** — Normalizes whitespace (trailing spaces, extra blank lines)
- **L5** — Compacts pretty-printed JSON in tool results

## Agentic Detection

`scorePrompt` sets `isAgentic: true` when the prompt contains tool-use keywords (`read file`, `run command`, `git commit`, `function_call`, etc.) or when `hasToolsArray = true`.

```typescript
scorePrompt('Read file config.json and update the port').isAgentic  // true
scorePrompt('What is 2 + 2?').isAgentic                             // false
scorePrompt('Any prompt', true).isAgentic                           // true (tools[] present)
```

## How ArcRouter Uses This

1. `scorePrompt()` → complexity tier → selects model tier (cheapest to most capable)
2. `detectTopicDetailed()` → topic + subcategory → semantic model selection
3. `normalizeRoutingBudget()` → budget tier → cost sensitivity weighting
4. `compressMessages()` → reduce tokens on long conversations → saves cost

The full ArcRouter stack (semantic routing, benchmark scoring, council consensus) runs on Cloudflare Workers at [api.arcrouter.com](https://api.arcrouter.com).

## Links

- **ArcRouter API:** https://api.arcrouter.com
- **SDK:** https://github.com/ArcRouterAI/arcrouter-sdk (`npm install @arcrouter/sdk`)
- **Docs:** https://arcrouter.com/docs
- **MCP server:** `claude mcp add arcrouter --transport http https://api.arcrouter.com/mcp`

## License

MIT
