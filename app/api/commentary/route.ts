import { NextRequest, NextResponse } from "next/server";

function buildFallback(btcPrice: number, btcChange: number, totalMarkets: number): string {
  const dir = btcChange >= 0 ? "up" : "down";
  const urgency = Math.abs(btcChange) > 3 ? "aggressively" : "steadily";
  const sentiment = btcChange >= 0 ? "bulls are in control" : "bears are pressing";
  return `BTC trading at $${(btcPrice || 0).toLocaleString()}, ${urgency} ${dir} ${Math.abs(btcChange || 0)}% in 24h — ${sentiment} heading into the session. ${totalMarkets} active commit-reveal contracts live on Starknet Sepolia; all positions stay fully private on-chain until the reveal window closes, locking out front-runners.`;
}

export async function POST(req: NextRequest) {
  // Destructure OUTSIDE try so catch can access them
  let btcPrice = 0, btcChange = 0, totalMarkets = 18;

  try {
    const body = await req.json();
    btcPrice = body.btcPrice || 0;
    btcChange = body.btcChange || 0;
    totalMarkets = body.totalMarkets || 18;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ commentary: buildFallback(btcPrice, btcChange, totalMarkets) });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Crypto analyst for ShadowTrade — privacy-first prediction market on Starknet. Live BTC: $${btcPrice.toLocaleString()} (${btcChange >= 0 ? "+" : ""}${btcChange}% 24h). ${totalMarkets} live contracts covering BTC price targets $100k-$150k, daily prices, ATH, dominance. Write 2 punchy analytical sentences using the live price. Mention commit-reveal privacy once. No emojis. Max 55 words. Sound like a desk trader.`
        }]
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", response.status, err);
      return NextResponse.json({ commentary: buildFallback(btcPrice, btcChange, totalMarkets) });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    return NextResponse.json({ commentary: text || buildFallback(btcPrice, btcChange, totalMarkets) });

  } catch (err) {
    console.error("Commentary API error:", err);
    return NextResponse.json({ commentary: buildFallback(btcPrice, btcChange, totalMarkets) });
  }
}