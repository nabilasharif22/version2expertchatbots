// functions/openaiChat.js
/**
 * Vercel Serverless Function
 * Calls OpenAI to generate a reply impersonating Expert A.
 * API key is stored securely in environment variables.
 */

export async function onRequestPost(context) {

  try {

    // Parse request body safely
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

    const apiKey = context.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("Missing OPENAI_API_KEY environment variable");

      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "You are a careful expert impersonator. Support claims with real papers when possible."
            },
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

      console.error("OpenAI API error:", data);

      return new Response(
        JSON.stringify({
          error: "OpenAI API error",
          details: data
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const text = data?.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ text }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {

    console.error("OpenAI server error:", error);

    return new Response(
      JSON.stringify({
        error: "Server error calling OpenAI."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );

  }
}