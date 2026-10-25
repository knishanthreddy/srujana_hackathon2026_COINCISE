import test from "node:test";
import assert from "node:assert";
import { POST } from "../src/app/api/assistant/route.ts";

// =========================================================================
// TEST SUITE 1: CHATBOT API INPUT VALIDATION
// =========================================================================
test("Assistant API: Validates input and rejects empty message", async () => {
  const req = new Request("http://localhost:3000/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "" }),
  });

  const res = await POST(req);
  assert.strictEqual(res.status, 400, "Empty message should return 400 Bad Request");
  const data = await res.json();
  assert.ok(data.error.includes("empty"), "Error must mention empty message");
});

// =========================================================================
// TEST SUITE 2: FALLBACK KNOWLEDGE BASE WHEN API KEY UNCONFIGURED
// =========================================================================
test("Assistant API: Returns accurate guidance when GEMINI_API_KEY is unconfigured", async () => {
  // Ensure GEMINI_API_KEY is empty in test environment
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const testQueries = [
      {
        query: "How do I add a financial transaction?",
        expectedWord: "Transaction",
      },
      {
        query: "Where can I find my receivables?",
        expectedWord: "Receivables",
      },
      {
        query: "What does my Credro score mean?",
        expectedWord: "Credro",
      },
      {
        query: "How do I understand my cash-flow forecast?",
        expectedWord: "Forecast",
      },
      {
        query: "Why am I receiving a cash-shortage alert?",
        expectedWord: "Reserve",
      },
      {
        query: "Where can I find my reports?",
        expectedWord: "Reports",
      },
    ];

    for (const item of testQueries) {
      const req = new Request("http://localhost:3000/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: item.query }),
      });

      const res = await POST(req);
      assert.strictEqual(res.status, 200, "Should return HTTP 200");
      const data = await res.json();

      assert.ok(data.response, `Should return response for query "${item.query}"`);
      assert.ok(
        data.response.includes(item.expectedWord),
        `Response for "${item.query}" should mention "${item.expectedWord}"`
      );
      assert.strictEqual(data.isAIGenerated, false, "Fallback must be marked isAIGenerated: false");
      assert.strictEqual(data.configurationRequired, true, "Should indicate configuration is required");
    }
  } finally {
    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  }
});

// =========================================================================
// TEST SUITE 3: GENERAL QUERY FALLBACK GUIDANCE
// =========================================================================
test("Assistant API: Returns comprehensive navigation menu for general inquiries", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const req = new Request("http://localhost:3000/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello, what can you do?" }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.response.includes("COINCISE Assistant"));
    assert.ok(data.response.includes("/records"));
    assert.ok(data.response.includes("/forecast"));
  } finally {
    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  }
});
