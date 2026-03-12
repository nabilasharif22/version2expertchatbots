// api/claudeChat.js
/**
 * Calls Anthropic Claude for Expert B
 * Requires ANTHROPIC_API_KEY in Vercel environment variables
 */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST method." });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Claude API key not set." });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Claude API error:", response.status, text);
      return res.status(response.status).json({ error: `Claude API error: ${response.status}` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    return res.status(200).json({ text });

  } catch (err) {
    console.error("Claude function failed:", err);
    return res.status(500).json({ error: "Server error calling Claude." });
  }
}