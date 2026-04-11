import { compressMessages, Message } from "../src/compression";

const makeMsg = (role: string, content: string): Message => ({ role, content });

// Pad a set of messages to exceed the 5000-char compression threshold
const withPad = (msgs: Message[], pad = 3000): Message[] => [
  ...msgs,
  makeMsg("user", "x".repeat(pad)),
];

describe("compressMessages", () => {
  test("no-op below threshold", () => {
    const msgs = [makeMsg("user", "Hello"), makeMsg("assistant", "Hi there!")];
    const { messages, stats } = compressMessages(msgs);
    expect(messages).toBe(msgs); // same reference — no copy made
    expect(stats.layers_applied).toHaveLength(0);
    expect(stats.ratio).toBe(1);
  });

  test("L1: deduplicates repeated assistant messages above threshold", () => {
    const repeated = "A".repeat(800);
    const msgs: Message[] = [
      makeMsg("user", "Q1" + " ".repeat(500)),
      makeMsg("assistant", repeated),
      makeMsg("user", "Q2" + " ".repeat(500)),
      makeMsg("assistant", repeated), // duplicate — should be removed
      makeMsg("user", "Q3" + " ".repeat(500)),
    ];
    // Total chars: (500+2)*3 user + 800*2 assistant = ~3106 — pad to exceed 5000
    const padded = withPad(msgs, 2000);
    const { messages, stats } = compressMessages(padded);
    expect(messages.length).toBeLessThan(padded.length);
    expect(stats.layers_applied).toContain("L1:dedup");
  });

  test("L1: does not deduplicate user messages", () => {
    const content = "repeat " + "x".repeat(800);
    const msgs: Message[] = [
      makeMsg("user", content),
      makeMsg("user", content),
      makeMsg("user", content),
    ];
    const padded = withPad(msgs, 2000);
    const before = padded.filter(m => m.role === "user").length;
    const { messages } = compressMessages(padded);
    const after = messages.filter(m => m.role === "user").length;
    expect(after).toBe(before); // all user messages preserved
  });

  test("L2: whitespace normalization applied when content has excess whitespace", () => {
    const msgWithTrailing = makeMsg("user", "Line 1   \nLine 2   \n\n\n\nLine 3   ");
    const msgs = Array.from({ length: 5 }, () => ({ ...msgWithTrailing }));
    const padded = withPad(msgs, 5000); // 5 × ~32 chars + 5000 pad > threshold
    const { stats } = compressMessages(padded);
    // L2 fires if any message has trailing whitespace / excess blank lines
    expect(stats.layers_applied).toContain("L2:whitespace");
  });

  test("L5: compacts JSON in tool results", () => {
    const prettyJson = JSON.stringify({ key: "value", nested: { a: 1, b: 2 } }, null, 2);
    const msgs: Message[] = [
      makeMsg("user", "Use the tool" + " ".repeat(500)),
      { role: "tool", content: prettyJson + " ".repeat(500), tool_call_id: "call_1" },
      makeMsg("assistant", " ".repeat(4000)),
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

  test("ratio is between 0 and 1 for compressed content", () => {
    const repeated = "z".repeat(1000);
    const msgs: Message[] = [
      makeMsg("assistant", repeated),
      makeMsg("assistant", repeated), // duplicate
      makeMsg("user", "x".repeat(4000)),
    ];
    const { stats } = compressMessages(msgs);
    expect(stats.ratio).toBeGreaterThan(0);
    expect(stats.ratio).toBeLessThanOrEqual(1);
  });
});
