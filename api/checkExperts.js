// functions/checkExperts.js
/**
 * Vercel Serverless Function
 * Validates that each expert has published papers using the Semantic Scholar API.
 */

export default async function handler(req, res) {

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {

    // Ensure body exists and parse if necessary
    let body = req.body;

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const expertA = body?.expertA?.trim();
    const expertB = body?.expertB?.trim();

    if (!expertA || !expertB) {
      return res.status(400).json({
        error: "Both expertA and expertB are required."
      });
    }

    // Query Semantic Scholar
    async function getPaperCount(name) {

      const url =
        `https://api.semanticscholar.org/graph/v1/author/search?query=` +
        encodeURIComponent(name) +
        `&fields=paperCount&limit=1`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Semantic Scholar error: ${response.status}`);
      }

      const data = await response.json();

      return data?.data?.[0]?.paperCount || 0;
    }

    const [countA, countB] = await Promise.all([
      getPaperCount(expertA),
      getPaperCount(expertB)
    ]);

    if (countA === 0 || countB === 0) {
      return res.status(400).json({
        error: "One or both experts have no published papers.",
        details: {
          [expertA]: countA,
          [expertB]: countB
        }
      });
    }

    return res.status(200).json({
      ok: true,
      counts: {
        [expertA]: countA,
        [expertB]: countB
      }
    });

  } catch (error) {

    console.error("checkExperts error:", error);

    return res.status(500).json({
      error: "Server failed to validate experts."
    });

  }
}