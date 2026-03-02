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
    const { expertA, expertB } = body;

    if (!expertA || !expertB) {
      return new Response(JSON.stringify({ error: "Both experts required." }), { status: 400 });
    }

    async function getCount(name) {
      const res = await fetch(`https://api.semanticscholar.org/graph/v1/author/search?query=${encodeURIComponent(name)}&fields=paperCount&limit=1`);
      const data = await res.json();
      return data.data?.[0]?.paperCount || 0;
    }

    const [countA, countB] = await Promise.all([getCount(expertA), getCount(expertB)]);

    if (countA === 0 || countB === 0) {
      return new Response(
        JSON.stringify({
          error: "One or both experts have no published papers.",
          details: { [expertA]: countA, [expertB]: countB }
        }),
        { status: 400 }
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error." }), { status: 500 });
  }
}