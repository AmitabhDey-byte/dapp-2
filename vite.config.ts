import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

type LocalApiRequest = {
  method?: string;
  on: (event: "data" | "end" | "error", callback: (chunk?: unknown) => void) => void;
};

type GeminiApiResponse = {
  error?: { message?: string };
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

declare const fetch: (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<GeminiApiResponse>;
}>;

async function readRequestBody(request: LocalApiRequest) {
  return new Promise<string>((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk?.toString() ?? "";
    });
    request.on("end", () => resolve(body));
    request.on("error", (error) => reject(error));
  });
}

function geminiPrompt(prompt: string, context: unknown) {
  return [
    "You are Nebula Pool's AI strategy copilot for a Stellar testnet dApp.",
    "Give concise, educational, non-financial guidance.",
    "Return a complete answer with 3-5 short sections or bullets. Do not stop mid-sentence.",
    "Do not promise profits. Mention that this is testnet/demo data when relevant.",
    `Current dApp context:\n${JSON.stringify(context ?? {}, null, 2)}`,
    `User question:\n${prompt}`
  ].join("\n\n");
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    base: env.VITE_BASE_PATH ?? "/",
    plugins: [
      react(),
      {
        name: "nebula-local-gemini-api",
        configureServer(server) {
          server.middlewares.use("/api/gemini", async (request, response) => {
            const localRequest = request as unknown as LocalApiRequest;

            if (localRequest.method !== "POST") {
              response.statusCode = 405;
              response.setHeader("Content-Type", "application/json");
              response.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            const apiKey = env.GEMINI_API_KEY;

            if (!apiKey) {
              response.statusCode = 500;
              response.setHeader("Content-Type", "application/json");
              response.end(JSON.stringify({ error: "Gemini API key is not configured in .env" }));
              return;
            }

            try {
              const body = JSON.parse(await readRequestBody(localRequest)) as {
                prompt?: string;
                context?: unknown;
              };
              const prompt = body.prompt?.trim();

              if (!prompt) {
                response.statusCode = 400;
                response.setHeader("Content-Type", "application/json");
                response.end(JSON.stringify({ error: "Prompt is required" }));
                return;
              }

              const model = env.GEMINI_MODEL ?? "gemini-2.5-flash";
              const geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [
                      {
                        role: "user",
                        parts: [{ text: geminiPrompt(prompt, body.context) }]
                      }
                    ],
                    generationConfig: {
                      temperature: 0.35,
                      maxOutputTokens: 900
                    }
                  })
                }
              );
              const data = await geminiResponse.json();

              if (!geminiResponse.ok) {
                response.statusCode = geminiResponse.status;
                response.setHeader("Content-Type", "application/json");
                response.end(JSON.stringify({ error: data.error?.message ?? "Gemini request failed" }));
                return;
              }

              const answer = data.candidates?.[0]?.content?.parts
                ?.map((part: { text?: string }) => part.text ?? "")
                .join("")
                .trim();

              response.statusCode = 200;
              response.setHeader("Content-Type", "application/json");
              response.end(JSON.stringify({ answer: answer || "Gemini did not return an answer." }));
            } catch (error) {
              response.statusCode = 500;
              response.setHeader("Content-Type", "application/json");
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Gemini request failed" }));
            }
          });
        }
      }
    ],
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            stellar: ["@stellar/freighter-api", "@stellar/stellar-sdk"]
          }
        }
      }
    }
  };
});
