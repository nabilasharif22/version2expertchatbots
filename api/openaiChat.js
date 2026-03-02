// functions/openaiChat.js
/**
 * openaiChat.js
 * Vercel Serverless Function
 * Calls OpenAI to generate a reply impersonating Expert A.
 * Enforces prompt from frontend. API key is kept secret in environment variables.
 */

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ text: "", error: "Prompt is required." }), { status: 400 });
    }

    const apiKey = context.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ text: "", error: "OpenAI API key not set." }), { status: 500 });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a careful expert impersonator. Only cite real papers authored or referenced by the expert."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.4
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI API Error:", res.status, errText);
      return new Response(JSON.stringify({ text: "", error: `OpenAI API error: ${res.status}` }), { status: res.status });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text }), { status: 200 });

  } catch (err) {
    console.error("OpenAI function failed:", err);
    return new Response(JSON.stringify({ text: "", error: "Server error calling OpenAI." }), { status: 500 });
  }
}