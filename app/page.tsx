"use client";

import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useReadContract, useSendTransaction } from "@starknet-react/core";
import {
  SHADOW_TRADE_ABI,
  SBTC_ADDRESS,
} from "@/constants/contracts";
import { useState, useEffect } from "react";
import { hash } from "starknet";

// All 3 deployed markets — update addresses after deploying each
const MARKETS = [
  {
    id: 1,
    address: "0x02048548a359413c764dace52c44cab112f49c0ac78761e9f6e5c91a2027803d",
    label: "BTC > $100k",
    target: "$100,000",
    icon: "🟡",
    color: "yellow",
  },
  {
    id: 2,
    address: "0x02048548a359413c764dace52c44cab112f49c0ac78761e9f6e5c91a2027803d",
    label: "BTC > $110k",
    target: "$110,000",
    icon: "🟠",
    color: "orange",
  },
  {
    id: 3,
    address: "0x02048548a359413c764dace52c44cab112f49c0ac78761e9f6e5c91a2027803d",
    label: "BTC > $120k",
    target: "$120,000",
    icon: "🔴",
    color: "red",
  },
];

function felt252ToString(felt: unknown): string {
  if (felt === undefined || felt === null) return "Loading...";
  try {
    const hex = BigInt(felt as bigint).toString(16);
    const padded = hex.length % 2 === 0 ? hex : "0" + hex;
    let str = "";
    for (let i = 0; i < padded.length; i += 2) {
      const code = parseInt(padded.slice(i, i + 2), 16);
      if (code > 31 && code < 127) str += String.fromCharCode(code);
    }
    return str || "BTC Prediction";
  } catch {
    return "BTC Prediction";
  }
}

function formatsBTC(raw: unknown): string {
  if (!raw) return "0";
  try {
    const val = BigInt(raw as bigint);
    if (val === BigInt(0)) return "0";
    return (val / BigInt("1000000000000000000")).toString();
  } catch {
    return "0";
  }
}

function MarketCard({
  market,
  isSelected,
  onSelect,
}: {
  market: typeof MARKETS[0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { data: marketRaw } = useReadContract({
    address: market.address as `0x${string}`,
    abi: SHADOW_TRADE_ABI,
    functionName: "get_market_info",
    args: [],
    watch: true,
  });

  const { data: poolRaw } = useReadContract({
    address: market.address as `0x${string}`,
    abi: SHADOW_TRADE_ABI,
    functionName: "get_pool_info",
    args: [],
    watch: true,
  });

  const m = marketRaw as Record<string, unknown> | undefined;
  const p = poolRaw as Record<string, unknown> | undefined;

  const resolved = m ? Boolean(m.resolved) : false;
  const outcome = m ? Number(m.outcome) : 0;
  const yesVotes = p ? Number(p.yes_votes) : 0;
  const noVotes = p ? Number(p.no_votes) : 0;
  const yesPool = p ? formatsBTC(p.yes_pool) : "0";
  const noPool = p ? formatsBTC(p.no_pool) : "0";
  const totalVotes = yesVotes + noVotes;
  const yesPct = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 50;

  const commitDeadline = m ? Number(m.commit_deadline) : 0;
  const revealDeadline = m ? Number(m.reveal_deadline) : 0;
  const now = Math.floor(Date.now() / 1000);
  const phase =
    commitDeadline === 0 ? "Loading"
    : now <= commitDeadline ? "Commit"
    : now <= revealDeadline ? "Reveal"
    : resolved ? "Resolved"
    : "Ended";

  const phaseColors: Record<string, string> = {
    Commit: "text-green-400 bg-green-400/10",
    Reveal: "text-blue-400 bg-blue-400/10",
    Ended: "text-gray-400 bg-gray-400/10",
    Resolved: "text-purple-400 bg-purple-400/10",
    Loading: "text-gray-500 bg-gray-500/10",
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 ${
        isSelected
          ? "border-amber-500/60 bg-amber-500/5 shadow-lg shadow-amber-500/10"
          : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{market.icon}</span>
          <div>
            <p className="font-bold text-white text-base">{market.label}</p>
            <p className="text-xs text-gray-500">by Feb 2026</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${phaseColors[phase]}`}>
          {phase}
        </span>
      </div>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-green-400 font-semibold">YES {yesPct}%</span>
          <span className="text-red-400 font-semibold">NO {100 - yesPct}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${yesPct}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{yesVotes + noVotes} participants</span>
        <span>{Number(yesPool) + Number(noPool)} sBTC vol.</span>
      </div>

      {resolved && (
        <div className="mt-2 text-xs font-bold text-center py-1 rounded-lg bg-purple-500/10 text-purple-300">
          {outcome === 1 ? "✅ YES Won" : "❌ NO Won"}
        </div>
      )}
    </button>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendAsync } = useSendTransaction({ calls: [] });

  const [selectedMarketIdx, setSelectedMarketIdx] = useState(0);
  const [vote, setVote] = useState<"1" | "2">("1");
  const [secret, setSecret] = useState("");
  const [stake, setStake] = useState("100");
  const [savedSecret, setSavedSecret] = useState("");
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [showWallet, setShowWallet] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("shadowtrade_secret");
    if (saved) setSavedSecret(saved);
  }, []);

  const selectedMarket = MARKETS[selectedMarketIdx];

  const { data: marketRaw } = useReadContract({
    address: selectedMarket.address as `0x${string}`,
    abi: SHADOW_TRADE_ABI,
    functionName: "get_market_info",
    args: [],
    watch: true,
  });

  const { data: poolRaw } = useReadContract({
    address: selectedMarket.address as `0x${string}`,
    abi: SHADOW_TRADE_ABI,
    functionName: "get_pool_info",
    args: [],
    watch: true,
  });

  const { data: userRaw } = useReadContract({
    address: selectedMarket.address as `0x${string}`,
    abi: SHADOW_TRADE_ABI,
    functionName: "get_user_info",
    args: address ? [address] : undefined,
    enabled: !!address,
    watch: true,
  });

  const m = marketRaw as Record<string, unknown> | undefined;
  const p = poolRaw as Record<string, unknown> | undefined;
  const u = userRaw as Record<string, unknown> | undefined;

  const question      = m ? felt252ToString(m.question)  : "Loading...";
  const commitDeadline = m ? Number(m.commit_deadline)   : 0;
  const revealDeadline = m ? Number(m.reveal_deadline)   : 0;
  const resolved      = m ? Boolean(m.resolved)          : false;
  const outcome       = m ? Number(m.outcome)            : 0;

  const yesVotes = p ? Number(p.yes_votes) : 0;
  const noVotes  = p ? Number(p.no_votes)  : 0;
  const yesPool  = p ? formatsBTC(p.yes_pool) : "0";
  const noPool   = p ? formatsBTC(p.no_pool)  : "0";

  const hasCommitted = u ? Boolean(u.has_committed) : false;
  const hasRevealed  = u ? Boolean(u.has_revealed)  : false;
  const hasClaimed   = u ? Boolean(u.has_claimed)   : false;

  const totalVotes = yesVotes + noVotes;
  const yesPct = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 50;

  const phase =
    commitDeadline === 0    ? "Loading"
    : now <= commitDeadline ? "Commit"
    : now <= revealDeadline ? "Reveal"
    : "Ended";

  const formatTimeLeft = (deadline: number) => {
    const diff = deadline - now;
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / 86400);
    const hrs  = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    if (days > 0) return `${days}d ${hrs}h`;
    if (hrs > 0)  return `${hrs}h ${mins}m`;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const handleCommit = async () => {
    if (!secret.trim()) return alert("Enter a secret");
    if (!stake || Number(stake) <= 0) return alert("Enter a stake > 0");
    const voteHex = vote === "1" ? "0x1" : "0x2";
    const commitment = hash.computePedersenHash(voteHex, secret);
    localStorage.setItem("shadowtrade_secret", secret);
    localStorage.setItem("shadowtrade_vote", vote);
    setSavedSecret(secret);
    try {
      setTxStatus("⏳ Submitting commitment...");
      await sendAsync([
        { contractAddress: SBTC_ADDRESS, entrypoint: "approve", calldata: [selectedMarket.address, stake, "0"] },
        { contractAddress: selectedMarket.address, entrypoint: "commit", calldata: [commitment, stake, "0"] },
      ]);
      setTxStatus("✅ Committed! Return during Reveal phase.");
    } catch (e) {
      console.error(e);
      setTxStatus("❌ Failed. See console.");
    }
  };

  const handleReveal = async () => {
    const storedSecret = localStorage.getItem("shadowtrade_secret");
    const storedVote   = localStorage.getItem("shadowtrade_vote") || vote;
    if (!storedSecret) return alert("No secret found!");
    try {
      setTxStatus("⏳ Revealing vote...");
      await sendAsync([
        { contractAddress: selectedMarket.address, entrypoint: "reveal", calldata: [storedVote === "1" ? "1" : "2", storedSecret] },
      ]);
      setTxStatus("✅ Vote revealed!");
    } catch (e) {
      console.error(e);
      setTxStatus("❌ Reveal failed.");
    }
  };

  const handleClaim = async () => {
    try {
      setTxStatus("⏳ Claiming winnings...");
      await sendAsync([
        { contractAddress: selectedMarket.address, entrypoint: "claim", calldata: [] },
      ]);
      setTxStatus("✅ Winnings claimed!");
    } catch (e) {
      console.error(e);
      setTxStatus("❌ Claim failed.");
    }
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "#0d0d0d", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .ticker { animation: ticker 20s linear infinite; }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .glow-yes { box-shadow: 0 0 20px rgba(34,197,94,0.3); }
        .glow-no  { box-shadow: 0 0 20px rgba(239,68,68,0.3); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>

      {/* Top ticker bar */}
      <div className="border-b border-white/5 bg-black/40 overflow-hidden py-2">
        <div className="flex ticker whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <span key={i} className="flex gap-8 mr-8">
              <span className="text-xs text-gray-500">BTC/USD <span className="text-green-400 font-mono">$97,420</span></span>
              <span className="text-xs text-gray-500">STRK <span className="text-green-400 font-mono">$0.42</span></span>
              <span className="text-xs text-gray-500">Starknet Sepolia <span className="text-green-400">● LIVE</span></span>
              <span className="text-xs text-gray-500">ShadowTrade <span className="text-amber-400 font-mono">Privacy-First</span></span>
              <span className="text-xs text-gray-500">Powered by <span className="text-purple-400">Pedersen Hash</span></span>
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-black text-sm">S</div>
            <div>
              <span className="font-bold text-white text-lg tracking-tight">ShadowTrade</span>
              <span className="ml-2 text-xs text-amber-400/70 font-medium">BETA</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <span className="text-white font-medium cursor-pointer">Markets</span>
            <span className="cursor-pointer hover:text-white transition-colors">Portfolio</span>
            <span className="cursor-pointer hover:text-white transition-colors">How it works</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              <span className="text-xs text-green-400 font-medium">Sepolia</span>
            </div>
            {!isConnected ? (
              <div className="relative">
                <button
                  onClick={() => setShowWallet(!showWallet)}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm px-4 py-2 rounded-xl transition-all"
                >
                  Connect Wallet
                </button>
                {showWallet && (
                  <div className="absolute right-0 top-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl p-2 min-w-48 z-50 shadow-2xl">
                    {connectors.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { connect({ connector: c }); setShowWallet(false); }}
                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-sm text-gray-300 hover:text-white"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-300">
                  {address?.slice(0, 8)}...{address?.slice(-4)}
                </div>
                <button onClick={() => disconnect()} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-2">
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Market list */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white">BTC Markets</h2>
              <span className="text-xs text-gray-500">{MARKETS.length} active</span>
            </div>
            {MARKETS.map((market, i) => (
              <MarketCard
                key={market.id}
                market={market}
                isSelected={selectedMarketIdx === i}
                onSelect={() => setSelectedMarketIdx(i)}
              />
            ))}

            {/* Privacy explainer */}
            <div className="mt-4 p-4 rounded-2xl border border-white/5 bg-white/2">
              <p className="text-xs font-semibold text-gray-300 mb-2">🛡️ How Privacy Works</p>
              <div className="space-y-1.5 text-xs text-gray-600">
                <p><span className="text-amber-400">Commit</span> — Send <code className="text-gray-400">hash(vote, secret)</code>. Vote hidden.</p>
                <p><span className="text-blue-400">Reveal</span> — Prove your vote after window closes.</p>
                <p><span className="text-green-400">Claim</span> — Winners split the losing pool.</p>
              </div>
            </div>
          </div>

          {/* RIGHT — Trading panel */}
          <div className="lg:col-span-2 space-y-4">

            {/* Market header */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{selectedMarket.icon}</span>
                    <h1 className="text-2xl font-black text-white">{selectedMarket.label}</h1>
                  </div>
                  <p className="text-gray-500 text-sm">{question}</p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                    phase === "Commit" ? "text-green-400 bg-green-400/10 border-green-400/20"
                    : phase === "Reveal" ? "text-blue-400 bg-blue-400/10 border-blue-400/20"
                    : "text-gray-400 bg-gray-400/10 border-gray-400/20"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${phase === "Commit" ? "bg-green-400 animate-pulse" : phase === "Reveal" ? "bg-blue-400 animate-pulse" : "bg-gray-400"}`} />
                    {phase} Phase
                  </div>
                  {(phase === "Commit" || phase === "Reveal") && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      {formatTimeLeft(phase === "Commit" ? commitDeadline : revealDeadline)} left
                    </p>
                  )}
                </div>
              </div>

              {/* Big probability display */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-green-400">{yesPct}%</p>
                  <p className="text-xs text-gray-500 mt-1">chance YES</p>
                  <p className="text-sm font-semibold text-green-400 mt-2">{yesVotes} votes · {yesPool} sBTC</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-red-400">{100 - yesPct}%</p>
                  <p className="text-xs text-gray-500 mt-1">chance NO</p>
                  <p className="text-sm font-semibold text-red-400 mt-2">{noVotes} votes · {noPool} sBTC</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
                  style={{ width: `${yesPct}%` }}
                />
              </div>

              {resolved && (
                <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                  <p className="text-purple-300 font-bold text-lg">
                    Market Resolved — {outcome === 1 ? "✅ YES wins!" : "❌ NO wins!"}
                  </p>
                </div>
              )}
            </div>

            {/* Trading Panel */}
            {isConnected ? (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white">Your Position</h3>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${hasCommitted ? "text-green-400 bg-green-900/30 border-green-500/30" : "text-gray-500 bg-white/5 border-white/10"}`}>
                      {hasCommitted ? "✓ Committed" : "Not committed"}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${hasRevealed ? "text-blue-400 bg-blue-900/30 border-blue-500/30" : "text-gray-500 bg-white/5 border-white/10"}`}>
                      {hasRevealed ? "✓ Revealed" : "Not revealed"}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${hasClaimed ? "text-purple-400 bg-purple-900/30 border-purple-500/30" : "text-gray-500 bg-white/5 border-white/10"}`}>
                      {hasClaimed ? "✓ Claimed" : "Not claimed"}
                    </span>
                  </div>
                </div>

                {/* COMMIT */}
                {phase === "Commit" && !hasCommitted && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setVote("1")}
                        className={`py-4 rounded-xl font-bold text-lg transition-all border ${vote === "1" ? "bg-green-600 border-green-500 text-white glow-yes" : "bg-white/3 border-white/10 text-gray-400 hover:border-green-500/40"}`}
                      >
                        YES ✅
                        <p className="text-xs font-normal opacity-70 mt-0.5">Buy YES shares</p>
                      </button>
                      <button
                        onClick={() => setVote("2")}
                        className={`py-4 rounded-xl font-bold text-lg transition-all border ${vote === "2" ? "bg-red-600 border-red-500 text-white glow-no" : "bg-white/3 border-white/10 text-gray-400 hover:border-red-500/40"}`}
                      >
                        NO ❌
                        <p className="text-xs font-normal opacity-70 mt-0.5">Buy NO shares</p>
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">
                        Secret Salt <span className="text-amber-400 text-xs">⚠️ Save this to reveal!</span>
                      </label>
                      <input
                        type="text"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        placeholder="e.g. 0x7a3f9c2b..."
                        className="w-full bg-black/40 border border-white/10 focus:border-amber-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-all font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Amount (sBTC)</label>
                      <div className="flex gap-2 mb-2">
                        {["10", "50", "100", "500"].map((v) => (
                          <button
                            key={v}
                            onClick={() => setStake(v)}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${stake === v ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"}`}
                          >
                            +{v}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={stake}
                        onChange={(e) => setStake(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-amber-500/50 rounded-xl px-4 py-3 text-white outline-none transition-all"
                      />
                    </div>

                    <button
                      onClick={handleCommit}
                      className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black py-4 rounded-xl transition-all text-lg shadow-lg shadow-amber-500/20"
                    >
                      🔒 Commit Vote
                    </button>
                  </div>
                )}

                {phase === "Commit" && hasCommitted && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
                    <p className="text-amber-300 font-semibold">✓ Commitment recorded on-chain</p>
                    <p className="text-gray-500 text-sm mt-1">Reveal phase opens soon. Keep your secret safe.</p>
                  </div>
                )}

                {phase === "Reveal" && hasCommitted && !hasRevealed && (
                  <div className="space-y-3">
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-sm">
                      <p className="text-blue-300">
                        Secret: <span className="font-mono text-xs text-gray-400">{savedSecret ? savedSecret.slice(0, 18) + "..." : "⚠️ Not found in this browser"}</span>
                      </p>
                    </div>
                    <button
                      onClick={handleReveal}
                      className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black py-4 rounded-xl transition-all text-lg"
                    >
                      👁️ Reveal My Vote
                    </button>
                  </div>
                )}

                {resolved && hasRevealed && !hasClaimed && (
                  <button
                    onClick={handleClaim}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 active:scale-95 text-white font-black py-4 rounded-xl transition-all text-lg shadow-lg shadow-green-500/20"
                  >
                    💰 Claim Winnings
                  </button>
                )}

                {hasClaimed && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-center">
                    <p className="text-green-300 font-bold text-xl">🎉 Winnings Claimed!</p>
                  </div>
                )}

                {phase === "Ended" && !resolved && (
                  <div className="bg-white/3 rounded-xl p-4 text-center">
                    <p className="text-gray-500">Market ended. Waiting for admin to resolve.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
                <p className="text-2xl mb-2">🔒</p>
                <p className="text-white font-bold mb-1">Connect to Trade</p>
                <p className="text-gray-500 text-sm mb-4">Use Argent or Braavos wallet on Starknet</p>
                <div className="flex gap-3 justify-center">
                  {connectors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => connect({ connector: c })}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-all"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {txStatus && (
              <div className={`rounded-xl p-4 text-sm text-center border ${
                txStatus.startsWith("✅") ? "bg-green-900/20 border-green-500/30 text-green-300"
                : txStatus.startsWith("❌") ? "bg-red-900/20 border-red-500/30 text-red-300"
                : "bg-amber-900/20 border-amber-500/30 text-amber-300 animate-pulse"
              }`}>
                {txStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-white/5 mt-8 px-6 py-4 text-center text-xs text-gray-600">
        ShadowTrade • Built for Starknet Resolve Hackathon • Powered by Pedersen Hash • Not financial advice
      </footer>
    </div>
  );
}