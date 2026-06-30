type VercelRequest = {
  method?: string;
  body?: {
    prompt?: string;
    context?: Record<string, unknown>;
  };
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

declare const process: {
  env: Record<string, string | undefined>;
};

const defaultModel = "gemini-2.5-flash";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    response.status(500).json({ error: "Gemini API key is not configured" });
    return;
  }

  const prompt = request.body?.prompt?.trim();

  if (!prompt) {
    response.status(400).json({ error: "Prompt is required" });
    return;
  }

  const model = process.env.GEMINI_MODEL ?? defaultModel;
  const context = JSON.stringify(request.body?.context ?? {}, null, 2);
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "You are Nebula Pool's AI strategy copilot for a Stellar testnet dApp.",
                  "Give concise, educational, non-financial guidance.",
                  "Return a complete answer with 3-5 short sections or bullets. Do not stop mid-sentence.",
                  "Do not promise profits. Mention that this is testnet/demo data when relevant.",
                  `Current dApp context:\n${context}`,
                  `User question:\n${prompt}`
                ].join("\n\n")
              }
            ]
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
    response.status(geminiResponse.status).json({
      error: data.error?.message ?? "Gemini request failed"
    });
    return;
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();

  response.status(200).json({
    answer: text || "Gemini did not return an answer."
  });
}
