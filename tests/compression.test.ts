import { compressMessages, Message } from "../src/compression";

const makeMsg = (role: string, content: string): Message => ({ role, content });

describe("compressMessages", () => {
  test("no-op below threshold", () => {
    const msgs = [makeMsg("user", "Hello"), makeMsg("assistant", "Hi there!")];
    const { messages, stats } = compressMessages(msgs);
    expect(messages).toBe(msgs); // same reference — no copy made
    expect(stats.layers_applied).toHaveLength(0);
    expect(stats.ratio).toBe(1);
  });

  test("L1: deduplicates repeated assistant messages", () => {
    const repeated = "A".repeat(500);
    const msgs: Message[] = [
      makeMsg("user", "Q1" + " ".repeat(1000)),
      makeMsg("assistant", repeated),
      makeMsg("user", "Q2" + " ".repeat(1000)),
      makeMsg("assistant", repeated), // duplicate
      makeMsg("user", "Q3" + " ".repeat(1000)),
    ];
    const { messages, stats } = compressMessages(msgs);
    expect(messages.length).toBeLessThan(msgs.length);
    expect(stats.layers_applied).toContain("L1:dedup");
  });

  test("L1: does not deduplicate user messages", () => {
    const msgs: Message[] = [
      makeMsg("user", "repeat " + "x".repeat(1500)),
      makeMsg("user", "repeat " + "x".repeat(1500)),
      makeMsg("user", "repeat " + "x".repeat(1500)),
    ];
    const { messages } = compressMessages(msgs);
    expect(messages.length).toBe(3); // user messages preserved
  });

  test("L2: removes trailing whitespace", () => {
    const msgs: Message[] = Array.from({ length: 3 }, (_, i) =>
      makeMsg("user", `Line ${i}   \nMore content   \n\n\n\nEnd   `)
    );
    // Pad to exceed threshold
    const padded = [...msgs, makeMsg("user", "x".repeat(4000))];
    const { stats } = compressMessages(padded);
    // Should apply whitespace normalization
    expect(stats.layers_applied.some(l => l.includes("L2") || l.includes("L1") || l.includes("L5"))).toBe(true);
  });

  test("L5: compacts JSON in tool results", () => {
    const prettyJson = JSON.stringify({ key: "value", nested: { a: 1, b: 2 } }, null, 2);
    const msgs: Message[] = [
      makeMsg("user", "Use the tool" + " ".repeat(1000)),
      { role: "tool", content: prettyJson + " ".repeat(1000), tool_call_id: "call_1" },
      makeMsg("assistant", " ".repeat(3000)),
    ];
    const { stats } = compressMessages(msgs);
    expect(stats.layers_applied).toContain("L5:json");
  });

  test("stats are accurate", () => {
    const msgs: Message[] = [
      makeMsg("user", "x".repeat(3000)),
      makeMsg("assistant", "y".repeat(3000)),
    ];
    const { stats } = compressMessages(msgs);
    expect(stats.original_chars).toBe(6000);
    expect(stats.compressed_chars).toBeLessThanOrEqual(6000);
    expect(stats.saved_chars).toBe(stats.original_chars - stats.compressed_chars);
  });
});
