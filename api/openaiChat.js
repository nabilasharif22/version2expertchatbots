// api/openaiChat.js
/**
 * Calls OpenAI to generate a reply for Expert A
 * Requires OPENAI_API_KEY in Vercel environment variables
 */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST method." });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required." });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OpenAI API key not set." });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a careful expert impersonator. Only cite real papers authored or referenced by the expert." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI API error:", response.status, text);
      return res.status(response.status).json({ error: `OpenAI API error: ${response.status}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ text });

  } catch (err) {
    console.error("OpenAI function failed:", err);
    return res.status(500).json({ error: "Server error calling OpenAI." });
  }
}