import { createServer } from "node:http";

const port = Number(process.env.PORT || 8787);
const apiKey = process.env.ANTHROPIC_API_KEY;
const anthropicVersion = process.env.ANTHROPIC_VERSION || "2023-06-01";
const defaultModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return sendJson(res, 204, {});
  }

  if (req.method !== "POST" || req.url !== "/api/claude") {
    return sendJson(res, 404, { error: "Not found" });
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
  }

  try {
    const payload = raw ? JSON.parse(raw) : {};

    if (!apiKey) {
      return sendJson(res, 200, {
        id: "local-demo-response",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "로컬 데모 모드입니다. ANTHROPIC_API_KEY를 .env에 넣으면 실제 AI 응답으로 바뀝니다.",
          },
        ],
      });
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": anthropicVersion,
      },
      body: JSON.stringify({
        model: payload.model || defaultModel,
        max_tokens: payload.max_tokens ?? 1000,
        system: payload.system,
        messages: payload.messages ?? [],
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    return sendJson(res, upstream.status, data);
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unknown server error",
    });
  }
});

server.listen(port, () => {
  console.log(`Assemble API server listening on http://localhost:${port}`);
});
