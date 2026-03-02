// functions/openaiChat.js
/**
 * openaiChat.js
 * Vercel Serverless Function
 * Calls OpenAI to generate a reply impersonating Expert A.
 * Enforces prompt from frontend. API key is kept secret in environment variables.
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body." });
  }

  // Read API key from environment variable
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfigured: missing API key." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a careful expert impersonator. Follow the user's instructions exactly, especially about citing only real papers authored or referenced by the expert."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.4
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `OpenAI API error: ${text}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return res.status(200).json({ text });
  } catch (err) {
    console.error("Error calling OpenAI API:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}