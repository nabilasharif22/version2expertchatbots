// functions/claudeChat.js
/**
 * claudeChat.js
 * Vercel Serverless Function
 * Calls Anthropic Claude to generate a reply impersonating Expert B.
 * Enforces prompt from frontend. API key is kept secret in environment variables.
 */

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ text: "", error: "Prompt is required." }), { status: 400 });
    }

    const apiKey = context.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ text: "", error: "Claude API key not set." }), { status: 500 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude API Error:", res.status, errText);
      return new Response(JSON.stringify({ text: "", error: `Claude API error: ${res.status}` }), { status: res.status });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    return new Response(JSON.stringify({ text }), { status: 200 });

  } catch (err) {
    console.error("Claude function failed:", err);
    return new Response(JSON.stringify({ text: "", error: "Server error calling Claude." }), { status: 500 });
  }
}