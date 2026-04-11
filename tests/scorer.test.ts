import { scorePrompt, detectAgentic, detectTopic, detectTopicDetailed } from "../src/scorer";

describe("scorePrompt", () => {
  test("SIMPLE: short factual query", () => {
    const result = scorePrompt("What is the capital of France?");
    expect(result.tier).toBe("SIMPLE");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  test("MEDIUM: explanation request", () => {
    const result = scorePrompt("Explain how TCP/IP works and why it was designed that way");
    expect(result.tier).toBe("MEDIUM");
  });

  test("COMPLEX: long implementation prompt (>1000 chars triggers length score)", () => {
    const longPrompt = "Implement a complete binary search tree data structure in TypeScript. " +
      "The BST should support the following operations: insert(value) to add a new node while " +
      "maintaining BST invariants, delete(value) to remove a node handling all three cases " +
      "(leaf, one child, two children) with in-order successor replacement, search(value) to " +
      "find whether a value exists in O(log n) average time, inOrderTraversal() to return all " +
      "values in sorted order, preOrderTraversal() and postOrderTraversal() for other traversals, " +
      "getHeight() to compute the maximum depth, and isBalanced() to check the AVL balance " +
      "condition. Handle edge cases including empty tree, duplicate values, and single-node " +
      "trees. Include TypeScript generics so the BST works for any comparable type.";
    const result = scorePrompt(longPrompt);
    expect(result.tier).toBe("COMPLEX");
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  test("REASONING: step-by-step reasoning", () => {
    const result = scorePrompt("Step by step, prove that the square root of 2 is irrational. Derive the proof by contradiction and explain each logical step.");
    expect(result.tier).toBe("REASONING");
  });

  test("long prompt (>1000 chars) scores COMPLEX or REASONING", () => {
    const longPrompt = "Write a detailed algorithm ".repeat(50);
    const result = scorePrompt(longPrompt);
    expect(["COMPLEX", "REASONING"]).toContain(result.tier);
  });

  test("isAgentic: false for regular prompts", () => {
    const result = scorePrompt("What is 2 + 2?");
    expect(result.isAgentic).toBe(false);
  });

  test("isAgentic: true for tool keywords", () => {
    const result = scorePrompt("Read file config.json and update the value");
    expect(result.isAgentic).toBe(true);
  });

  test("isAgentic: true when tools array present", () => {
    const result = scorePrompt("What is 2+2?", true);
    expect(result.isAgentic).toBe(true);
  });

  test("score increases with length", () => {
    const short = scorePrompt("Hi");
    const medium = scorePrompt("Explain the difference between TCP and UDP in networking");
    expect(medium.score).toBeGreaterThan(short.score);
  });
});

describe("detectTopic", () => {
  test("code: programming task returns code category", () => {
    // detectTopic returns subcategory when detected — verify it's under 'code'
    const result = detectTopic("Write a Python function to sort a list");
    expect(result).toMatch(/^code/);
  });

  test("math: calculus question", () => {
    expect(detectTopic("Solve the integral of x^2 from 0 to 1 with respect to dx")).toMatch(/^math/);
  });

  test("science: physics question", () => {
    expect(detectTopic("Explain how quantum entanglement works at the particle level")).toMatch(/^science/);
  });

  test("writing: essay request", () => {
    expect(detectTopic("Write a persuasive essay about climate change policy")).toMatch(/^writing/);
  });

  test("general: simple question", () => {
    expect(detectTopic("What time is it?")).toBe("general");
  });

  test("code/security: SQL injection prompt with multiple security markers", () => {
    const result = detectTopic(
      "Implement JWT authentication with SQL injection prevention, XSS filtering, CSRF tokens, and OAuth2 in my Express API"
    );
    expect(result).toBe("code/security");
  });

  test("math not misclassified as code for matrix notation", () => {
    const topic = detectTopic("Find the eigenvalues of the matrix [[1,2],[3,4]] and compute its inverse determinant");
    expect(topic).toMatch(/^math/);
  });

  test("thermodynamics correctly classified as science", () => {
    expect(detectTopic("Explain the laws of thermodynamics and how they relate to entropy")).toMatch(/^science/);
  });
});

describe("detectTopicDetailed", () => {
  test("returns confidence score", () => {
    const result = detectTopicDetailed("Implement a React component with TypeScript for a login form with JWT auth");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.primary).toBe("code");
  });

  test("returns secondary subcategory for high-confidence code prompt", () => {
    // Use a prompt with many code markers so confidence > 0.3 threshold
    const result = detectTopicDetailed(
      "Debug the undefined reference error in this JavaScript function: function foo() { return bar; }"
    );
    expect(result.primary).toBe("code");
    expect(result.secondary).toBeDefined();
  });

  test("no secondary for low-confidence prompt", () => {
    const result = detectTopicDetailed("What time is it?");
    expect(result.primary).toBe("general");
    expect(result.secondary).toBeUndefined();
  });
});
