/**
 * Example: classify a prompt with arcrouter-classifier
 *
 * Run with: npx tsx examples/classify.ts
 * Or after build: node dist/examples/classify.js
 */

import { scorePrompt, detectTopicDetailed, normalizeRoutingBudget, compressMessages } from "../src/index";

const prompts = [
  "What is the capital of France?",
  "Write a Python function to merge two sorted arrays",
  "Explain quantum entanglement and why it doesn't allow faster-than-light communication",
  "Step by step, prove that sqrt(2) is irrational using proof by contradiction",
  "Summarize the key differences between Rust and Go for systems programming",
];

console.log("=== arcrouter-classifier demo ===\n");

for (const prompt of prompts) {
  const complexity = scorePrompt(prompt);
  const topic = detectTopicDetailed(prompt);

  console.log(`Prompt: "${prompt.slice(0, 60)}..."`);
  console.log(`  Topic:      ${topic.secondary ?? topic.primary} (confidence: ${topic.confidence.toFixed(2)})`);
  console.log(`  Complexity: ${complexity.tier} (score: ${complexity.score}, confidence: ${complexity.confidence.toFixed(2)})`);
  console.log(`  Agentic:    ${complexity.isAgentic}`);
  console.log();
}

// Budget normalization
console.log("=== Budget normalization ===\n");
const budgets = ["low", "medium", "high", "economy", "auto", "premium", "free", undefined];
for (const b of budgets) {
  console.log(`  "${b ?? "undefined"}" → "${normalizeRoutingBudget(b)}"`);
}

// Compression
console.log("\n=== Compression demo ===\n");
const messages = [
  { role: "user", content: "Write a function to sort a list in Python" },
  { role: "assistant", content: "Here's a Python function:\n\ndef sort_list(lst):\n    return sorted(lst)\n\nThis uses Python's built-in sorted() function." },
  { role: "user", content: "Now add type hints and a docstring   \n\n\n" },
  { role: "assistant", content: "Here's a Python function:\n\ndef sort_list(lst):\n    return sorted(lst)\n\nThis uses Python's built-in sorted() function." }, // duplicate
];

// Add padding to trigger compression
const padded = [
  ...messages,
  { role: "user", content: "x".repeat(4200) },
];

const { stats } = compressMessages(padded);
console.log(`  Original:   ${stats.original_chars} chars`);
console.log(`  Compressed: ${stats.compressed_chars} chars`);
console.log(`  Saved:      ${stats.saved_chars} chars (${((1 - stats.ratio) * 100).toFixed(1)}%)`);
console.log(`  Layers:     ${stats.layers_applied.join(", ") || "none"}`);
