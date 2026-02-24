import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { btcPrice, btcChange, totalMarkets } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Crypto analyst for ShadowTrade — privacy-first prediction market on Starknet. Live BTC: $${btcPrice?.toLocaleString()} (${btcChange >= 0 ? "+" : ""}${btcChange}% 24h). ${totalMarkets} live contracts covering BTC price targets $100k-$150k, daily prices, ATH, dominance. Write 2 punchy analytical sentences using the live price. Mention commit-reveal privacy once. No emojis. Max 55 words. Sound like a desk trader.`
        }]
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    return NextResponse.json({ commentary: text });
  } catch (err) {
    console.error("Commentary API error:", err);
    return NextResponse.json({ commentary: "" }, { status: 500 });
  }
}