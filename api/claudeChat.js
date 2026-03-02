// functions/claudeChat.js
/**
 * claudeChat.js
 * Vercel Serverless Function
 * Calls Anthropic Claude to generate a reply impersonating Expert B.
 * Enforces prompt from frontend. API key is kept secret in environment variables.
 */

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body." });
  }

  // Read API key from environment variable
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfigured: missing API key." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Claude API error: ${text}` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    return res.status(200).json({ text });
  } catch (err) {
    console.error("Error calling Claude API:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}