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

  test("COMPLEX: code implementation", () => {
    const result = scorePrompt("Implement a binary search tree with insert, delete, and search operations in TypeScript");
    expect(result.tier).toBe("COMPLEX");
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  test("REASONING: step-by-step reasoning", () => {
    const result = scorePrompt("Step by step, prove that the sum of angles in a triangle equals 180 degrees and derive the formula for the exterior angle theorem");
    expect(result.tier).toBe("REASONING");
  });

  test("long prompt boosts score", () => {
    const longPrompt = "Write a detailed algorithm ".repeat(50);
    const result = scorePrompt(longPrompt);
    expect(result.score).toBeGreaterThan(35);
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
});

describe("detectTopic", () => {
  test("code: programming task", () => {
    expect(detectTopic("Write a Python function to sort a list")).toBe("code");
  });

  test("math: calculus question", () => {
    expect(detectTopic("Solve the integral of x^2 from 0 to 1")).toMatch(/^math/);
  });

  test("science: physics question", () => {
    expect(detectTopic("Explain how quantum entanglement works")).toMatch(/^science/);
  });

  test("writing: essay request", () => {
    expect(detectTopic("Write a persuasive essay about climate change")).toMatch(/^writing/);
  });

  test("general: simple question", () => {
    expect(detectTopic("What time is it?")).toBe("general");
  });

  test("code/security subcategory", () => {
    expect(detectTopic("How do I prevent SQL injection attacks in my API?")).toBe("code/security");
  });

  test("math not misclassified as code for matrix", () => {
    const topic = detectTopic("Find the eigenvalues of the matrix [[1,2],[3,4]]");
    expect(topic).toMatch(/^math/);
  });
});

describe("detectTopicDetailed", () => {
  test("returns confidence score", () => {
    const result = detectTopicDetailed("Implement a React component for a login form");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.primary).toBe("code");
  });

  test("returns secondary for subcategory match", () => {
    const result = detectTopicDetailed("Fix the null pointer exception in my JavaScript code");
    expect(result.primary).toBe("code");
    expect(result.secondary).toBeDefined();
  });
});
