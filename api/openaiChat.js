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
    const apiKey = context.env.OPENAI_API_KEY;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a careful expert impersonator. Only cite real papers." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4
      })
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ text: "Error calling OpenAI." }), { status: 500 });
  }
}