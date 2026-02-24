"use client";

import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useReadContract, useSendTransaction } from "@starknet-react/core";
import { SHADOW_TRADE_ABI, SBTC_ADDRESS } from "@/constants/contracts";
import { useState, useEffect, useCallback } from "react";
import { hash } from "starknet";

// ── DEMO CONTRACT (all markets point here until real contracts deployed) ────
const DEMO = "0x02048548a359413c764dace52c44cab112f49c0ac78761e9f6e5c91a2027803d";

// ── MARKET CATEGORIES ───────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "price-targets",
    icon: "🎯",
    title: "What price will BTC hit in February?",
    subtitle: "Pick your price target — private commit-reveal voting",
    vol: "$96.6M",
    ends: "Mar 1, 2026",
    tag: "Trending",
    tagColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    type: "multi", // multiple rows
    rows: [
      { label: "↑ $150,000", address: DEMO, vol: "$24.2M" },
      { label: "↑ $125,000", address: DEMO, vol: "$3.6M"  },
      { label: "↑ $120,000", address: DEMO, vol: "$3.0M"  },
      { label: "↑ $115,000", address: DEMO, vol: "$3.3M"  },
      { label: "↑ $110,000", address: DEMO, vol: "$2.0M"  },
      { label: "↑ $105,000", address: DEMO, vol: "$2.4M"  },
      { label: "↑ $100,000", address: DEMO, vol: "$3.4M"  },
    ],
  },
  {
    id: "daily-price",
    icon: "📅",
    title: "Bitcoin price on specific date?",
    subtitle: "Predict BTC closing price on a specific day",
    vol: "$5.2M",
    ends: "Mar 1, 2026",
    tag: "Ending Soon",
    tagColor: "text-red-400 bg-red-400/10 border-red-400/20",
    type: "multi",
    rows: [
      { label: "Feb 24 above $95k", address: DEMO, vol: "$926K" },
      { label: "Feb 25 above $95k", address: DEMO, vol: "$822K" },
      { label: "Feb 26 above $95k", address: DEMO, vol: "$486K" },
      { label: "Feb 28 above $95k", address: DEMO, vol: "$312K" },
      { label: "Mar 1  above $95k", address: DEMO, vol: "$198K" },
    ],
  },
  {
    id: "ath",
    icon: "📈",
    title: "Will Bitcoin hit ATH in 2026?",
    subtitle: "All-time high currently at ~$109,000",
    vol: "$18.4M",
    ends: "Dec 31, 2026",
    tag: "New",
    tagColor: "text-green-400 bg-green-400/10 border-green-400/20",
    type: "yesno",
    rows: [
      { label: "YES — BTC breaks ATH in 2026", address: DEMO, vol: "$18.4M" },
      { label: "NO  — BTC stays below ATH",    address: DEMO, vol: "$18.4M" },
    ],
  },
  {
    id: "dominance",
    icon: "💹",
    title: "BTC dominance above 60% in 2026?",
    subtitle: "Bitcoin's share of total crypto market cap",
    vol: "$7.1M",
    ends: "Dec 31, 2026",
    tag: "New",
    tagColor: "text-green-400 bg-green-400/10 border-green-400/20",
    type: "yesno",
    rows: [
      { label: "YES — BTC dominance > 60%", address: DEMO, vol: "$7.1M" },
      { label: "NO  — Dominance stays < 60%", address: DEMO, vol: "$7.1M" },
    ],
  },
];

type Row = typeof CATEGORIES[0]["rows"][0];

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatsBTC(raw: unknown): string {
  if (!raw) return "0";
  try {
    const val = BigInt(raw as bigint);
    if (val === BigInt(0)) return "0";
    return (val / BigInt("1000000000000000000")).toString();
  } catch { return "0"; }
}

// ── Market row in a table ────────────────────────────────────────────────────
function MarketRow({
  row, staticVol, isSelected, selectedVote, btcPrice,
  onYes, onNo,
}: {
  row: Row; staticVol: string; isSelected: boolean;
  selectedVote: "1"|"2"|null; btcPrice: number;
  onYes: () => void; onNo: () => void;
}) {
  const { data: poolRaw } = useReadContract({
    address: row.address as `0x${string}`,
    abi: SHADOW_TRADE_ABI, functionName: "get_pool_info", args: [], watch: true,
  });
  const { data: mktRaw } = useReadContract({
    address: row.address as `0x${string}`,
    abi: SHADOW_TRADE_ABI, functionName: "get_market_info", args: [], watch: true,
  });

  const p = poolRaw as Record<string,unknown> | undefined;
  const m = mktRaw  as Record<string,unknown> | undefined;

  const yV = p ? Number(p.yes_votes) : 0;
  const nV = p ? Number(p.no_votes)  : 0;
  const tot = yV + nV;
  const yesPct = tot > 0 ? Math.round((yV/tot)*100) : 50;
  const noPct  = 100 - yesPct;

  const now = Math.floor(Date.now()/1000);
  const cd = m ? Number(m.commit_deadline) : 0;
  const rd = m ? Number(m.reveal_deadline) : 0;
  const resolved = m ? Boolean(m.resolved) : false;
  const phase =
    cd === 0 ? "—"
    : now <= cd ? "Commit"
    : now <= rd ? "Reveal"
    : resolved ? "Resolved" : "Ended";

  // Try to extract a price number from the label for distance calc
  const priceMatch = row.label.match(/\$(\d{2,3}),?(\d{3})/);
  let awayEl = null;
  if (priceMatch && btcPrice) {
    const target = parseInt(priceMatch[1] + (priceMatch[2] || "000"));
    const pct = ((target - btcPrice) / btcPrice * 100);
    const col = pct > 0 ? "text-red-400" : "text-green-400";
    awayEl = <span className={`text-xs font-mono ${col}`}>{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</span>;
  }

  return (
    <tr className={`border-b border-white/4 transition-colors ${isSelected ? "bg-amber-500/5" : "hover:bg-white/3"}`}>
      <td className="py-3.5 pl-5 pr-2">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-sm text-white font-medium">{row.label}</p>
            {awayEl && <div className="mt-0.5">{awayEl}</div>}
          </div>
        </div>
      </td>
      <td className="py-3.5 px-2 text-xs text-gray-600 whitespace-nowrap">{staticVol}</td>
      <td className="py-3.5 px-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
          phase==="Commit"   ? "bg-green-500/10 text-green-400"
          : phase==="Reveal" ? "bg-blue-500/10 text-blue-400"
          : phase==="Ended"||phase==="Resolved" ? "bg-gray-500/10 text-gray-500"
          : "bg-white/5 text-gray-600"
        }`}>{phase}</span>
      </td>
      <td className="py-3.5 px-2 text-right">
        <span className="text-green-400 font-bold text-sm">{yesPct}%</span>
      </td>
      <td className="py-3.5 px-1.5">
        <button onClick={onYes} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${
          isSelected && selectedVote==="1"
            ? "bg-green-600 border-green-500 text-white shadow-md shadow-green-500/20"
            : "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
        }`}>YES {yesPct}¢</button>
      </td>
      <td className="py-3.5 pl-1.5 pr-5">
        <button onClick={onNo} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${
          isSelected && selectedVote==="2"
            ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-500/20"
            : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
        }`}>NO {noPct}¢</button>
      </td>
    </tr>
  );
}

// ── Category block ───────────────────────────────────────────────────────────
function CategoryBlock({
  cat, selectedKey, selectedVote, btcPrice,
  onSelect,
}: {
  cat: typeof CATEGORIES[0];
  selectedKey: string | null;
  selectedVote: "1"|"2"|null;
  btcPrice: number;
  onSelect: (key: string, vote: "1"|"2") => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden mb-4">
      {/* Category header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/3 transition-colors text-left"
      >
        <span className="text-xl shrink-0">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-white text-sm">{cat.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cat.tagColor}`}>{cat.tag}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-600">
            <span className="text-amber-400 font-semibold">{cat.vol} Vol.</span>
            <span>Ends {cat.ends}</span>
            <span>{cat.rows.length} outcome{cat.rows.length > 1 ? "s" : ""}</span>
          </div>
        </div>
        <span className="text-gray-600 text-xs shrink-0">{collapsed ? "▼" : "▲"}</span>
      </button>

      {!collapsed && (
        <div className="border-t border-white/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 pl-5 pr-2 text-xs text-gray-600 font-medium">Outcome</th>
                <th className="text-left py-2 px-2 text-xs text-gray-600 font-medium">Vol.</th>
                <th className="text-left py-2 px-2 text-xs text-gray-600 font-medium">Phase</th>
                <th className="text-right py-2 px-2 text-xs text-gray-600 font-medium">YES%</th>
                <th className="py-2 px-1.5"></th>
                <th className="py-2 pl-1.5 pr-5"></th>
              </tr>
            </thead>
            <tbody>
              {cat.rows.map((row, i) => {
                const key = `${cat.id}-${i}`;
                return (
                  <MarketRow
                    key={key}
                    row={row}
                    staticVol={row.vol}
                    isSelected={selectedKey === key}
                    selectedVote={selectedKey === key ? selectedVote : null}
                    btcPrice={btcPrice}
                    onYes={() => onSelect(key, "1")}
                    onNo={() => onSelect(key, "2")}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendAsync } = useSendTransaction({ calls: [] });

  const [selectedKey, setSelectedKey]   = useState<string | null>(null);
  const [selectedVote, setSelectedVote] = useState<"1"|"2"|null>(null);
  const [secret, setSecret]             = useState("");
  const [stake, setStake]               = useState("100");
  const [savedSecret, setSavedSecret]   = useState("");
  const [txStatus, setTxStatus]         = useState<string | null>(null);
  const [now, setNow]                   = useState(Math.floor(Date.now()/1000));
  const [showWallet, setShowWallet]     = useState(false);
  const [btcPrice, setBtcPrice]         = useState(96617);
  const [btcChange, setBtcChange]       = useState(0);
  const [commentary, setCommentary]     = useState("");
  const [commLoading, setCommLoading]   = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQ, setSearchQ]           = useState("");

  useEffect(() => {
    const iv = setInterval(() => setNow(Math.floor(Date.now()/1000)), 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    const s = localStorage.getItem("shadowtrade_secret");
    if (s) setSavedSecret(s);
  }, []);

  // Live BTC price
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true");
        const d = await r.json();
        setBtcPrice(Math.round(d.bitcoin.usd));
        setBtcChange(parseFloat(d.bitcoin.usd_24h_change?.toFixed(2)));
      } catch {}
    };
    fetch_();
    const iv = setInterval(fetch_, 60000);
    return () => clearInterval(iv);
  }, []);

  // AI commentary
  const fetchCommentary = useCallback(async () => {
    setCommLoading(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a sharp crypto analyst for ShadowTrade — a privacy-first prediction market on Starknet. 
Live BTC: $${btcPrice.toLocaleString()} (${btcChange >= 0 ? "+" : ""}${btcChange}% 24h). 
Markets: BTC price targets $100k-$150k, daily BTC prices, ATH prediction, BTC dominance.
Write 2 punchy analytical sentences referencing the live price. Mention the commit-reveal privacy advantage once. No emojis. Max 55 words. Sound like a desk trader.`
          }]
        })
      });
      const d = await r.json();
      setCommentary(d.content?.[0]?.text || "");
    } catch {
      setCommentary(`BTC at $${btcPrice.toLocaleString()} with ${btcChange >= 0 ? "+" : ""}${btcChange}% in 24h. ShadowTrade's commit-reveal scheme means no participant could front-run others' positions before the window closed — a structural edge over transparent order-book prediction markets.`);
    }
    setCommLoading(false);
  }, [btcPrice, btcChange]);

  useEffect(() => { if (btcPrice) fetchCommentary(); }, [btcPrice]);

  // Derive selected row's contract address
  const getSelectedAddress = (): string => {
    if (!selectedKey) return DEMO;
    const [catId, rowIdxStr] = selectedKey.split("-").slice(0, -1).join("-").split(/-([\d]+)$/);
    // parse catId and rowIdx from key like "price-targets-2"
    const parts = selectedKey.split("-");
    const rowIdx = parseInt(parts[parts.length - 1]);
    const cat = CATEGORIES.find(c => selectedKey.startsWith(c.id));
    return cat?.rows[rowIdx]?.address ?? DEMO;
  };

  const selectedAddress = getSelectedAddress();

  const { data: selMktRaw } = useReadContract({
    address: selectedAddress as `0x${string}`,
    abi: SHADOW_TRADE_ABI, functionName: "get_market_info", args: [], watch: true,
    enabled: !!selectedKey,
  });
  const { data: selUserRaw } = useReadContract({
    address: selectedAddress as `0x${string}`,
    abi: SHADOW_TRADE_ABI, functionName: "get_user_info",
    args: address ? [address] : undefined,
    enabled: !!address && !!selectedKey, watch: true,
  });

  const sm = selMktRaw  as Record<string,unknown> | undefined;
  const su = selUserRaw as Record<string,unknown> | undefined;

  const commitDL    = sm ? Number(sm.commit_deadline) : 0;
  const revealDL    = sm ? Number(sm.reveal_deadline)  : 0;
  const resolved    = sm ? Boolean(sm.resolved)        : false;
  const outcome     = sm ? Number(sm.outcome)          : 0;
  const hasCommitted = su ? Boolean(su.has_committed)  : false;
  const hasRevealed  = su ? Boolean(su.has_revealed)   : false;
  const hasClaimed   = su ? Boolean(su.has_claimed)    : false;

  const phase =
    commitDL === 0    ? "Loading"
    : now <= commitDL ? "Commit"
    : now <= revealDL ? "Reveal"
    : "Ended";

  const fmtTL = (dl: number) => {
    const d = dl - now;
    if (d <= 0) return "Ended";
    const days = Math.floor(d/86400);
    const hrs  = Math.floor((d%86400)/3600);
    const mins = Math.floor((d%3600)/60);
    const secs = d%60;
    if (days > 0) return `${days}d ${hrs}h`;
    if (hrs > 0)  return `${hrs}h ${mins}m`;
    return `${mins}m ${secs.toString().padStart(2,"0")}s`;
  };

  const handleSelect = (key: string, vote: "1"|"2") => {
    setSelectedKey(key);
    setSelectedVote(vote);
  };

  const handleCommit = async () => {
    if (!selectedKey)        return alert("Select a market first");
    if (!secret.trim())      return alert("Enter a secret");
    if (Number(stake) <= 0)  return alert("Enter stake > 0");
    const commitment = hash.computePedersenHash(selectedVote === "1" ? "0x1" : "0x2", secret);
    localStorage.setItem("shadowtrade_secret", secret);
    localStorage.setItem("shadowtrade_vote", selectedVote || "1");
    setSavedSecret(secret);
    try {
      setTxStatus("⏳ Confirming in wallet...");
      await sendAsync([
        { contractAddress: SBTC_ADDRESS, entrypoint: "approve", calldata: [selectedAddress, stake, "0"] },
        { contractAddress: selectedAddress, entrypoint: "commit", calldata: [commitment, stake, "0"] },
      ]);
      setTxStatus("✅ Committed! Come back to reveal.");
    } catch (e) { console.error(e); setTxStatus("❌ Failed. See console."); }
  };

  const handleReveal = async () => {
    const s = localStorage.getItem("shadowtrade_secret");
    const v = localStorage.getItem("shadowtrade_vote") || "1";
    if (!s) return alert("No secret found!");
    try {
      setTxStatus("⏳ Revealing...");
      await sendAsync([{ contractAddress: selectedAddress, entrypoint: "reveal", calldata: [v === "1" ? "1" : "2", s] }]);
      setTxStatus("✅ Revealed!");
    } catch (e) { console.error(e); setTxStatus("❌ Reveal failed."); }
  };

  const handleClaim = async () => {
    try {
      setTxStatus("⏳ Claiming...");
      await sendAsync([{ contractAddress: selectedAddress, entrypoint: "claim", calldata: [] }]);
      setTxStatus("✅ Claimed!");
    } catch (e) { console.error(e); setTxStatus("❌ Claim failed."); }
  };

  // Filter categories
  const filters = ["All", "Bitcoin", "Crypto Prices", "ATH", "Ending Soon"];
  const filteredCats = CATEGORIES.filter(cat => {
    if (searchQ && !cat.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (activeFilter === "All") return true;
    if (activeFilter === "Bitcoin") return cat.id !== "dominance";
    if (activeFilter === "Crypto Prices") return cat.id === "price-targets" || cat.id === "daily-price";
    if (activeFilter === "ATH") return cat.id === "ath";
    if (activeFilter === "Ending Soon") return cat.id === "daily-price";
    return true;
  });

  // Get label of selected market for display
  const getSelectedLabel = () => {
    if (!selectedKey) return null;
    const parts = selectedKey.split("-");
    const rowIdx = parseInt(parts[parts.length - 1]);
    const cat = CATEGORIES.find(c => selectedKey.startsWith(c.id));
    return cat?.rows[rowIdx]?.label ?? null;
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "#0d0d0d", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .ticker { animation: ticker 28s linear infinite; }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
      `}</style>

      {/* Ticker */}
      <div className="border-b border-white/5 bg-black/60 py-1.5 overflow-hidden">
        <div className="flex ticker whitespace-nowrap">
          {[...Array(2)].map((_,i) => (
            <span key={i} className="flex gap-10 mr-10 text-xs text-gray-600">
              <span>BTC/USD <span className="text-green-400 font-mono font-bold">${btcPrice.toLocaleString()}</span>
                <span className={`ml-1 ${btcChange>=0?"text-green-400":"text-red-400"}`}>{btcChange>=0?"▲":"▼"}{Math.abs(btcChange)}%</span>
              </span>
              <span>STRK <span className="text-amber-400 font-mono">$0.42</span></span>
              <span>Starknet Sepolia <span className="text-green-400">● LIVE</span></span>
              <span>ShadowTrade <span className="text-purple-400">Privacy-First · Commit-Reveal Protocol</span></span>
              <span>480+ markets · Powered by <span className="text-amber-400">Pedersen Hash</span></span>
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 px-6 py-3.5 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-black text-black text-lg">S</div>
              <span className="font-black text-white text-lg tracking-tight">ShadowTrade</span>
              <span className="text-xs text-amber-400/60 font-semibold border border-amber-400/20 bg-amber-400/5 px-1.5 py-0.5 rounded-md hidden sm:block">BETA</span>
            </div>
            <nav className="hidden md:flex gap-5 text-sm text-gray-500">
              <span className="text-white font-semibold cursor-pointer">Markets</span>
              <span className="hover:text-white cursor-pointer transition-colors">Portfolio</span>
              <span className="hover:text-white cursor-pointer transition-colors">Activity</span>
              <span className="hover:text-white cursor-pointer transition-colors">How it works</span>
            </nav>
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-xs">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search markets..."
                className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-amber-500/30 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-500 bg-white/3 border border-white/8 rounded-lg px-2.5 py-1.5">
              <span className="text-green-400 text-xs">●</span> Sepolia
            </div>
            {!isConnected ? (
              <div className="relative">
                <button onClick={() => setShowWallet(!showWallet)}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm px-4 py-2 rounded-xl transition-all shadow-lg shadow-amber-500/20">
                  Connect
                </button>
                {showWallet && (
                  <div className="absolute right-0 top-full mt-2 bg-[#161616] border border-white/10 rounded-2xl p-2 min-w-44 z-50 shadow-2xl">
                    {connectors.map(c => (
                      <button key={c.id} onClick={() => { connect({ connector: c }); setShowWallet(false); }}
                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-all">
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-300">
                  {address?.slice(0,8)}...{address?.slice(-4)}
                </div>
                <button onClick={() => disconnect()} className="text-xs text-gray-600 hover:text-red-400 px-2 py-2 transition-colors">✕</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* Filter tabs — like Polymarket's category tabs */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                activeFilter === f
                  ? "bg-white text-black border-white"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              }`}>
              {f}
            </button>
          ))}
          <div className="ml-auto flex gap-2 shrink-0">
            {["Trending","Newest","Volume"].map(s => (
              <button key={s} className="text-xs text-gray-600 hover:text-gray-400 transition-colors px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* AI Commentary */}
        <div className="bg-white/3 border border-white/8 rounded-2xl px-5 py-3.5 mb-5 flex items-start gap-3">
          <span className="text-base shrink-0 mt-0.5">🤖</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-500">AI Market Commentary</span>
              {btcPrice > 0 && (
                <span className="text-xs font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                  BTC ${btcPrice.toLocaleString()} {btcChange>=0?"▲":"▼"}{Math.abs(btcChange)}%
                </span>
              )}
            </div>
            {commLoading
              ? <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
              : <p className="text-xs text-gray-400 leading-relaxed">{commentary||"Fetching analysis..."}</p>
            }
          </div>
          <button onClick={fetchCommentary} disabled={commLoading}
            className="text-xs text-gray-600 hover:text-gray-400 shrink-0 transition-colors disabled:opacity-30 mt-0.5">↻</button>
        </div>

        {/* Two-column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT: Market categories */}
          <div className="lg:col-span-2">

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Total Volume", value: "$127M+", sub: "across all markets" },
                { label: "Active Markets", value: `${CATEGORIES.reduce((a,c)=>a+c.rows.length,0)}`, sub: "live on Starknet" },
                { label: "Privacy Method", value: "Pedersen Hash", sub: "commit-reveal protocol" },
              ].map(s => (
                <div key={s.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <p className="text-xs text-gray-600 mb-1">{s.label}</p>
                  <p className="font-black text-white text-lg leading-none">{s.value}</p>
                  <p className="text-xs text-gray-600 mt-1">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Category blocks */}
            {filteredCats.length === 0
              ? <div className="text-center py-16 text-gray-600">No markets found for "{searchQ}"</div>
              : filteredCats.map(cat => (
                <CategoryBlock
                  key={cat.id}
                  cat={cat}
                  selectedKey={selectedKey}
                  selectedVote={selectedVote}
                  btcPrice={btcPrice}
                  onSelect={handleSelect}
                />
              ))
            }
          </div>

          {/* RIGHT: Trade panel */}
          <div className="space-y-4">

            {/* Trade box */}
            <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden sticky top-20">
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-white/5">
                {selectedKey ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Selected Market</p>
                    <p className="font-bold text-white text-sm leading-snug">{getSelectedLabel()}</p>
                    {selectedVote && (
                      <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full border font-semibold ${
                        selectedVote==="1"
                          ? "bg-green-500/10 border-green-500/20 text-green-400"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}>
                        Buying {selectedVote==="1" ? "YES ✅" : "NO ❌"}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 py-1">← Pick YES or NO on any market</p>
                )}
              </div>

              <div className="p-5">
                {!isConnected ? (
                  <div className="text-center py-3">
                    <p className="text-gray-600 text-sm mb-3">Connect wallet to trade</p>
                    {connectors.map(c => (
                      <button key={c.id} onClick={() => connect({ connector: c })}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl transition-all text-sm mb-2">
                        {c.name}
                      </button>
                    ))}
                  </div>
                ) : !selectedKey ? (
                  <div className="py-10 text-center">
                    <p className="text-4xl mb-3">🎯</p>
                    <p className="text-gray-600 text-sm">Browse markets on the left and click YES or NO to begin</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Status badges */}
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { label: hasCommitted?"✓ Committed":"Not committed", on: hasCommitted, c:"green" },
                        { label: hasRevealed?"✓ Revealed":"Not revealed",   on: hasRevealed,  c:"blue"  },
                        { label: hasClaimed?"✓ Claimed":"Not claimed",      on: hasClaimed,   c:"purple"},
                      ].map(b => (
                        <span key={b.label} className={`text-xs px-2 py-1 rounded-full border ${
                          b.on
                            ? b.c==="green"  ? "bg-green-900/30 border-green-500/30 text-green-400"
                            : b.c==="blue"   ? "bg-blue-900/30 border-blue-500/30 text-blue-400"
                            : "bg-purple-900/30 border-purple-500/30 text-purple-400"
                            : "bg-white/5 border-white/10 text-gray-600"
                        }`}>{b.label}</span>
                      ))}
                    </div>

                    {/* COMMIT form */}
                    {phase==="Commit" && !hasCommitted && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setSelectedVote("1")}
                            className={`py-3 rounded-xl font-bold text-sm border transition-all ${selectedVote==="1"?"bg-green-600 border-green-500 text-white":"bg-white/3 border-white/10 text-gray-400 hover:border-green-500/30"}`}>
                            YES ✅
                          </button>
                          <button onClick={() => setSelectedVote("2")}
                            className={`py-3 rounded-xl font-bold text-sm border transition-all ${selectedVote==="2"?"bg-red-600 border-red-500 text-white":"bg-white/3 border-white/10 text-gray-400 hover:border-red-500/30"}`}>
                            NO ❌
                          </button>
                        </div>

                        <div>
                          <label className="text-xs text-gray-500 block mb-1.5">
                            Secret Salt <span className="text-amber-400">⚠️ Save this!</span>
                          </label>
                          <input type="text" value={secret} onChange={e => setSecret(e.target.value)}
                            placeholder="e.g. 0x7a3f9c2b..."
                            className="w-full bg-black/40 border border-white/10 focus:border-amber-500/40 rounded-xl px-3 py-2.5 text-white placeholder-gray-700 outline-none text-xs font-mono transition-all"/>
                        </div>

                        <div>
                          <label className="text-xs text-gray-500 block mb-1.5">Amount (sBTC)</label>
                          <div className="grid grid-cols-4 gap-1 mb-2">
                            {["10","50","100","500"].map(v => (
                              <button key={v} onClick={() => setStake(v)}
                                className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${stake===v?"bg-amber-500/20 border-amber-500/40 text-amber-400":"bg-white/3 border-white/8 text-gray-600 hover:text-gray-300"}`}>
                                +{v}
                              </button>
                            ))}
                          </div>
                          <input type="number" value={stake} onChange={e => setStake(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 focus:border-amber-500/40 rounded-xl px-3 py-2.5 text-white outline-none transition-all text-sm"/>
                        </div>

                        <button onClick={handleCommit}
                          className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 text-sm">
                          🔒 Commit Vote
                        </button>
                      </>
                    )}

                    {phase==="Commit" && hasCommitted && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
                        <p className="text-amber-300 font-semibold text-sm">✓ Committed on-chain</p>
                        <p className="text-gray-600 text-xs mt-1">Reveal opens in <span className="font-mono text-gray-400">{fmtTL(commitDL)}</span></p>
                      </div>
                    )}

                    {phase==="Reveal" && hasCommitted && !hasRevealed && (
                      <div className="space-y-2">
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-xs">
                          <p className="text-blue-300">Secret: <span className="font-mono text-gray-500">{savedSecret?savedSecret.slice(0,16)+"...":"⚠️ Not found"}</span></p>
                        </div>
                        <button onClick={handleReveal}
                          className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black py-3.5 rounded-xl transition-all text-sm">
                          👁️ Reveal My Vote
                        </button>
                      </div>
                    )}

                    {resolved && hasRevealed && !hasClaimed && (
                      <button onClick={handleClaim}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-green-500/20 text-sm">
                        💰 Claim Winnings
                      </button>
                    )}

                    {hasClaimed && (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-center">
                        <p className="text-green-300 font-bold">🎉 Winnings Claimed!</p>
                      </div>
                    )}

                    {phase==="Ended" && !resolved && (
                      <div className="bg-white/3 rounded-xl p-4 text-center">
                        <p className="text-gray-600 text-sm">Waiting for resolution.</p>
                      </div>
                    )}

                    {resolved && (
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-center">
                        <p className="text-purple-300 font-bold">{outcome===1?"✅ YES Won":"❌ NO Won"}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Market info */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-2.5">
              <p className="text-xs font-semibold text-gray-500 mb-3">About ShadowTrade</p>
              {[
                { k: "Privacy",    v: "Pedersen Hash commit-reveal" },
                { k: "Chain",      v: "Starknet Sepolia" },
                { k: "Token",      v: "sBTC (testnet)" },
                { k: "Resolution", v: "Admin · Pragma Oracle soon" },
                { k: "Built for",  v: "Starknet Resolve Hackathon" },
              ].map(r => (
                <div key={r.k} className="flex justify-between text-xs">
                  <span className="text-gray-600">{r.k}</span>
                  <span className="text-gray-300 font-medium text-right">{r.v}</span>
                </div>
              ))}
            </div>

            {/* Privacy steps */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-500 mb-3">🛡️ How Privacy Works</p>
              <div className="space-y-3">
                {[
                  { n:"1", c:"amber", t:"Commit", d:"Submit hash(vote, secret). Your position is invisible on-chain until reveal." },
                  { n:"2", c:"blue",  t:"Reveal",  d:"After window closes, prove your vote with your secret salt." },
                  { n:"3", c:"green", t:"Claim",   d:"Winners split the losing pool proportionally. Fully trustless." },
                ].map(s => (
                  <div key={s.n} className="flex gap-3">
                    <span className={`text-xs font-black shrink-0 mt-0.5 ${s.c==="amber"?"text-amber-400":s.c==="blue"?"text-blue-400":"text-green-400"}`}>{s.n}.</span>
                    <div>
                      <p className={`text-xs font-semibold ${s.c==="amber"?"text-amber-400":s.c==="blue"?"text-blue-400":"text-green-400"}`}>{s.t}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {txStatus && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className={`px-6 py-3 rounded-2xl text-sm font-semibold shadow-2xl border backdrop-blur-xl ${
            txStatus.startsWith("✅") ? "bg-green-900/90 border-green-500/30 text-green-300"
            : txStatus.startsWith("❌") ? "bg-red-900/90 border-red-500/30 text-red-300"
            : "bg-amber-900/90 border-amber-500/30 text-amber-300 animate-pulse"
          }`}>
            {txStatus}
            <button onClick={() => setTxStatus(null)} className="ml-4 opacity-50 hover:opacity-100">✕</button>
          </div>
        </div>
      )}

      <footer className="border-t border-white/5 mt-6 px-6 py-4 text-center text-xs text-gray-700">
        ShadowTrade · Built for Starknet Resolve Hackathon · Powered by Pedersen Hash · Not financial advice
      </footer>
    </div>
  );
}