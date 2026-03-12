// functions/claudeChat.js
/**
 * Vercel Serverless Function
 * Calls Anthropic Claude to generate a reply impersonating Expert B.
 * API key is stored securely in environment variables.
 */

export async function onRequestPost(context) {

  try {

    // Safely parse JSON body
    let body;
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = body?.prompt?.trim();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = context.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error("Missing ANTHROPIC_API_KEY environment variable");

      return new Response(
        JSON.stringify({ error: "Claude API key not configured." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 600,
          temperature: 0.4,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {

      console.error("Claude API error:", data);

      return new Response(
        JSON.stringify({
          error: "Claude API error",
          details: data
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const text = data?.content?.[0]?.text || "";

    return new Response(
      JSON.stringify({ text }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {

    console.error("Claude server error:", error);

    return new Response(
      JSON.stringify({
        error: "Server error calling Claude."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );

  }
}