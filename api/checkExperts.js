// functions/checkExperts.js
/**
 * checkExperts.js
 * Vercel Serverless Function
 * Validates that each expert has published papers using Semantic Scholar API.
 */

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Parse request body
  let expertA, expertB;
  try {
    ({ expertA, expertB } = req.body);
    if (!expertA || !expertB) {
      return res.status(400).json({ error: "Both expertA and expertB are required." });
    }
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  // Function to fetch paper count for a single expert
  async function getCount(name) {
    try {
      const url = `https://api.semanticscholar.org/graph/v1/author/search?query=${encodeURIComponent(
        name
      )}&fields=paperCount&limit=1`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Semantic Scholar API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.[0]?.paperCount || 0;
    } catch (err) {
      console.error(`Error fetching data for ${name}:`, err);
      return 0;
    }
  }

  try {
    const [countA, countB] = await Promise.all([getCount(expertA), getCount(expertB)]);

    if (countA === 0 || countB === 0) {
      return res.status(400).json({
        error: "One or both experts have no published papers.",
        details: { [expertA]: countA, [expertB]: countB }
      });
    }

    // Success
    return res.status(200).json({ ok: true, counts: { [expertA]: countA, [expertB]: countB } });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}