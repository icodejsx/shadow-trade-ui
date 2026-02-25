"use client";

import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useReadContract, useSendTransaction } from "@starknet-react/core";
import { SHADOW_TRADE_ABI, SBTC_ADDRESS } from "@/constants/contracts";
import { useState, useEffect, useCallback } from "react";
import { hash } from "starknet";
import { BsRobot } from 'react-icons/bs';
import { IoIosSearch } from "react-icons/io";
import { PiCurrencyBtc } from "react-icons/pi";
import { SlCalender } from "react-icons/sl";

// ── 14 REAL DEPLOYED CONTRACTS ──────────────────────────────────────────────
// DEMO contract for live demo use
const DEMO_CONTRACT = "0x02048548a359413c764dace52c44cab112f49c0ac78761e9f6e5c91a2027803d";

const CATEGORIES = [
  {
    id: "demo",
    icon: <PiCurrencyBtc  className="text-yellow-600" />,
    title: "LIVE DEMO — Will BTC close above $60k today?",
    subtitle: "Demo market · Short window for live testing",
    vol: "$0", ends: "Today", tag: "🔴 DEMO",
    tagColor: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    commitDeadline: 1771941195,
    revealDeadline: 1771946595,
    rows: [
      { label: "YES — BTC above $60k today", address: DEMO_CONTRACT, vol: "$0" },
      { label: "NO  — BTC below $60k today", address: DEMO_CONTRACT, vol: "$0" },
    ],
  },
  {
    id: "daily-price",
    icon: <SlCalender className="text-yellow-600" />,
    title: "Bitcoin above $95k on specific date?",
    subtitle: "Predict BTC closing price on a specific day",
    vol: "$5.2M", ends: "Feb 26, 2026", tag: "Ending Soon",
    tagColor: "text-red-400 bg-red-400/10 border-red-400/20",
    commitDeadline: 1772112195,
    revealDeadline: 1772284995,
    rows: [
      { label: "Feb 24 above $95k", address: "0x04c060c33a84ff944bead8ce014cb5ed4c6579d2999a0cf3749a12bd3c3e2d47", vol: "$926K" },
      { label: "Feb 25 above $95k", address: "0x0768d404c7ac9f75e0b2a62588d5c1b26082f26ab3828c88f3295786e013ae13", vol: "$822K" },
      { label: "Feb 26 above $95k", address: "0x05a906a9d0accd0e8c6d3062e62dd5c9fc339bdf45436193ee26a0367a216e8e", vol: "$486K" },
      { label: "Feb 28 above $95k", address: "0x036d36eb9e18b128e0a5e8f654b81da08c1ac2f0b90642d095eb527b020ab700", vol: "$312K" },
      { label: "Mar 1  above $95k", address: "0x0298d0e781aae3652e097ec6e8aa5740db7c5aa5ec7707b2be2e7fd81d43fc6b", vol: "$198K" },
    ],
  },
  {
    id: "price-targets",
    icon: "🎯",
    title: "What price will BTC hit by March?",
    subtitle: "Pick your price target — private commit-reveal voting",
    vol: "$96.6M", ends: "Mar 3, 2026", tag: "Trending",
    tagColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    commitDeadline: 1772544195,
    revealDeadline: 1773148995,
    rows: [
      { label: "↑ $150,000", address: "0x0149e867efb998512c7dba108ca95e4e2386f959fea9106bf63a13a6608a6fdf", vol: "$24.2M" },
      { label: "↑ $125,000", address: "0x060c407353af6a2b049b6656a35b86e915696f5556bc0f315f0c903a65ac1369", vol: "$3.6M"  },
      { label: "↑ $120,000", address: "0x06810b417d99dd81c3922308cfd7a7012c848c1d470f86e198d63b9a5334d756", vol: "$3.0M"  },
      { label: "↑ $115,000", address: "0x01127692f3513f966c4767b50a890c73bfef7ec808469579ea8de08dd99b6ecb", vol: "$3.3M"  },
      { label: "↑ $110,000", address: "0x0694c68210e74541d4541f2ea9324b25fec86efdd6740ea25ed327ca5767af56", vol: "$2.0M"  },
      { label: "↑ $105,000", address: "0x069b231ea2747ba209bcd8824ed8a4535b1b02023c64e182c497025bc3b3303f", vol: "$2.4M"  },
      { label: "↑ $100,000", address: "0x0435724c3fcabb38c443f365a8a4034363a5db167ecfe368c3226bdb2f00d3e0", vol: "$3.4M"  },
    ],
  },
  {
    id: "ath",
    icon: "📈",
    title: "Will Bitcoin hit ATH in 2026?",
    subtitle: "All-time high currently ~$109,000. Does BTC break it this year?",
    vol: "$18.4M", ends: "Mar 26, 2026", tag: "New",
    tagColor: "text-green-400 bg-green-400/10 border-green-400/20",
    commitDeadline: 1774531395,
    revealDeadline: 1775827395,
    rows: [
      { label: "YES — BTC breaks ATH in 2026", address: "0x01e143f51a67dccc788b1b3151b3366be56231333da79a9e300e84bc2ca3ec7b", vol: "$18.4M" },
      { label: "NO  — BTC stays below ATH",    address: "0x01e143f51a67dccc788b1b3151b3366be56231333da79a9e300e84bc2ca3ec7b", vol: "$18.4M" },
    ],
  },
  {
    id: "dominance",
    icon: "💹",
    title: "BTC dominance above 60% in 2026?",
    subtitle: "Bitcoin's share of total crypto market cap",
    vol: "$7.1M", ends: "Apr 25, 2026", tag: "New",
    tagColor: "text-green-400 bg-green-400/10 border-green-400/20",
    commitDeadline: 1777123395,
    revealDeadline: 1779715395,
    rows: [
      { label: "YES — BTC dominance > 60%",   address: "0x0136d4dd8d059c858a67824e0e03170fc045e694251aa79897973d7885721747", vol: "$7.1M" },
      { label: "NO  — Dominance stays < 60%", address: "0x0136d4dd8d059c858a67824e0e03170fc045e694251aa79897973d7885721747", vol: "$7.1M" },
    ],
  },
];

// Total market count — defined at module level so it's available everywhere
const TOTAL_MARKETS = CATEGORIES.reduce((a,c) => a + c.rows.length, 0);

type Row = typeof CATEGORIES[0]["rows"][0];
type Category = typeof CATEGORIES[0];

function formatsBTC(raw: unknown): string {
  if (!raw) return "0";
  try {
    const val = BigInt(raw as bigint);
    if (val === BigInt(0)) return "0";
    return (val / BigInt("1000000000000000000")).toString();
  } catch { return "0"; }
}

// ── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(deadline: number) {
  const [tick, setTick] = useState(Math.floor(Date.now()/1000));
  useEffect(() => {
    const iv = setInterval(() => setTick(Math.floor(Date.now()/1000)), 1000);
    return () => clearInterval(iv);
  }, []);
  const secs = deadline - tick;
  if (secs <= 0) return { str: "Ended", urgent: false, days: 0, hours: 0, mins: 0, secs: 0 };
  const days  = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins  = Math.floor((secs % 3600) / 60);
  const s     = secs % 60;
  const urgent = secs < 3600; // less than 1 hour = urgent red
  let str = "";
  if (days > 0)       str = `${days}d ${hours}h ${mins}m`;
  else if (hours > 0) str = `${hours}h ${mins}m ${s.toString().padStart(2,"0")}s`;
  else                str = `${mins}m ${s.toString().padStart(2,"0")}s`;
  return { str, urgent, days, hours, mins, secs: s };
}

// ── Single market row ────────────────────────────────────────────────────────
function MarketRow({ row, staticVol, isSelected, selectedVote, btcPrice, onYes, onNo }: {
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
    cd === 0    ? "—"
    : now <= cd ? "Commit"
    : now <= rd ? "Reveal"
    : resolved  ? "Resolved" : "Ended";

  // Live countdown — shows commit deadline during Commit phase, reveal deadline during Reveal
  const activeDL = phase === "Commit" ? cd : phase === "Reveal" ? rd : 0;
  const countdown = useCountdown(activeDL);

  // Distance calc for price target rows
  const priceMatch = row.label.match(/\$([\d,]+)/);
  let awayEl = null;
  if (priceMatch && btcPrice) {
    const target = parseInt(priceMatch[1].replace(/,/g,""));
    if (target > 10000) {
      const pct = ((target - btcPrice) / btcPrice * 100);
      const col = pct > 0 ? "text-red-400" : "text-green-400";
      awayEl = <span className={`text-xs font-mono ${col}`}>{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</span>;
    }
  }

  return (
    <tr className={`border-b border-white/4 transition-colors ${isSelected ? "bg-amber-500/5" : "hover:bg-white/3"}`}>
      <td className="py-3 pl-5 pr-2">
        <div>
          <p className="text-sm text-white font-medium">{row.label}</p>
          {awayEl && <div className="mt-0.5">{awayEl}</div>}
        </div>
      </td>
      <td className="py-3 px-2 text-xs text-gray-600 whitespace-nowrap">{staticVol}</td>

      {/* Phase + countdown */}
      <td className="py-3 px-2">
        <div className="flex flex-col gap-0.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap w-fit ${
            phase==="Commit"   ? "bg-green-500/10 text-green-400"
            : phase==="Reveal" ? "bg-blue-500/10 text-blue-400"
            : phase==="Ended"||phase==="Resolved" ? "bg-gray-500/10 text-gray-500"
            : "bg-white/5 text-gray-600"
          }`}>{phase}</span>
          {activeDL > 0 && countdown.str !== "Ended" && (
            <span className={`text-xs font-mono tabular-nums whitespace-nowrap ${
              countdown.urgent ? "text-red-400 animate-pulse" : "text-gray-500"
            }`}>
        
            </span>
          )}
        </div>
      </td>

      <td className="py-3 px-2 text-right">
        <span className="text-green-400 font-bold text-sm">{yesPct}%</span>
      </td>
      <td className="py-3 px-1.5">
        <button onClick={onYes} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${
          isSelected && selectedVote==="1"
            ? "bg-green-600 border-green-500 text-white shadow-md shadow-green-500/20"
            : "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
        }`}>YES {yesPct}¢</button>
      </td>
      <td className="py-3 pl-1.5 pr-5">
        <button onClick={onNo} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${
          isSelected && selectedVote==="2"
            ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-500/20"
            : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
        }`}>NO {noPct}¢</button>
      </td>
    </tr>
  );
}

// ── Big countdown for trade panel ────────────────────────────────────────────
function CommitCountdown({ deadline }: { deadline: number }) {
  const cd = useCountdown(deadline);

  if (deadline === 0) return null;

  return (
    <div className={`rounded-xl border p-3 text-center ${
      cd.urgent
        ? "bg-red-500/10 border-red-500/30 animate-pulse"
        : "bg-amber-500/5 border-amber-500/20"
    }`}>
      <p className={`text-xs font-semibold mb-1 ${cd.urgent ? "text-red-400" : "text-amber-400"}`}>
        {cd.urgent ? "⚠️ Closing soon!" : "⏱ Commit window closes in"}
      </p>
      <p className={`text-2xl font-black font-mono tabular-nums tracking-tight ${
        cd.urgent ? "text-red-300" : "text-white"
      }`}>
        {cd.str === "Ended" ? "Closed" : cd.str}
      </p>
      {!cd.urgent && cd.days > 0 && (
        <div className="flex justify-center gap-4 mt-2">
          {[
            { v: cd.days,  l: "DAYS"  },
            { v: cd.hours, l: "HRS"   },
            { v: cd.mins,  l: "MINS"  },
            { v: cd.secs,  l: "SECS"  },
          ].map(({ v, l }) => (
            <div key={l} className="text-center">
              <p className="text-lg font-black text-white font-mono tabular-nums">{String(v).padStart(2,"0")}</p>
              <p className="text-xs text-gray-600">{l}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Category block ───────────────────────────────────────────────────────────
function CategoryBlock({ cat, selectedKey, selectedVote, btcPrice, onSelect }: {
  cat: typeof CATEGORIES[0];
  selectedKey: string | null; selectedVote: "1"|"2"|null; btcPrice: number;
  onSelect: (key: string, vote: "1"|"2") => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const cd = useCountdown(cat.commitDeadline || 0);
  const isDemo = cat.id === "demo";

  return (
    <div className={`border rounded-2xl overflow-hidden mb-4 ${isDemo ? "border-purple-500/30 bg-purple-500/5" : "border-white/8 bg-white/3"}`}>
      {/* Category-level countdown banner */}
      {cat.commitDeadline && cd.str !== "Ended" && (
        <div className={`px-5 py-2 flex items-center justify-between border-b ${
          cd.urgent ? "bg-red-500/10 border-red-500/20" 
          : isDemo  ? "bg-purple-500/10 border-purple-500/20"
          : "bg-white/3 border-white/5"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${cd.urgent ? "text-red-400 animate-pulse" : isDemo ? "text-purple-400" : "text-gray-500"}`}>
              {cd.urgent ? "⚠️ Closing soon!" : "⏱ Commit closes in"}
            </span>
          </div>
          <span className={`text-sm font-black font-mono tabular-nums ${
            cd.urgent ? "text-red-300" : isDemo ? "text-purple-300" : "text-white"
          }`}>{cd.str}</span>
        </div>
      )}
      {cat.commitDeadline && cd.str === "Ended" && (
        <div className="px-5 py-2 flex items-center justify-between border-b border-white/5 bg-white/3">
          <span className="text-xs text-gray-600">Commit window closed · Reveal phase</span>
          <span className="text-xs font-mono text-blue-400">Reveal open</span>
        </div>
      )}

      <button onClick={() => setCollapsed(c => !c)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/3 transition-colors text-left">
        <span className="text-xl shrink-0">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold text-sm ${isDemo ? "text-purple-200" : "text-white"}`}>{cat.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cat.tagColor}`}>{cat.tag}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-600">
            <span className="text-amber-400 font-semibold">{cat.vol} Vol.</span>
            <span>Ends {cat.ends}</span>
            <span className="text-green-400">● Live on Starknet</span>
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
                  <MarketRow key={key} row={row} staticVol={row.vol}
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendAsync } = useSendTransaction({ calls: [] });

  const [selectedKey, setSelectedKey]   = useState<string|null>(null);
  const [selectedVote, setSelectedVote] = useState<"1"|"2"|null>(null);
  const [secret, setSecret]             = useState("");
  const [stake, setStake]               = useState("100");
  const [savedSecret, setSavedSecret]   = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  const [txStatus, setTxStatus]         = useState<string|null>(null);
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
  // Auto-generate a secret when a market is selected
  useEffect(() => {
    if (!selectedKey) return;
    const storageKey = `shadowtrade_secret_${selectedKey}`;
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      setSecret(existing);
      setSavedSecret(existing);
    } else {
      // Generate a cryptographically random secret
      const arr = new Uint8Array(16);
      window.crypto.getRandomValues(arr);
      const generated = "0x" + Array.from(arr).map(b => b.toString(16).padStart(2,"0")).join("");
      setSecret(generated);
      setSavedSecret(generated);
      localStorage.setItem(storageKey, generated);
      localStorage.setItem("shadowtrade_secret", generated); // keep legacy key for reveal
    }
  }, [selectedKey]);
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

  const fetchCommentary = useCallback(async () => {
    setCommLoading(true);
    try {
      const r = await fetch("/api/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ btcPrice, btcChange, TOTAL_MARKETS }),
      });
      const d = await r.json();
      setCommentary(d.commentary || "");
    } catch {
      setCommentary(`BTC at $${btcPrice.toLocaleString()} (${btcChange>=0?"+":""}${btcChange}% 24h) — ${TOTAL_MARKETS} live markets on-chain across price targets, daily closes, ATH, and dominance. Commit-reveal ensures no position is visible until reveal, eliminating front-running entirely.`);
    }
    setCommLoading(false);
  }, [btcPrice, btcChange, TOTAL_MARKETS]);

  useEffect(() => { if (btcPrice) fetchCommentary(); }, [btcPrice]);

  // Derive selected contract address from key
  const getSelectedAddress = (): string => {
    if (!selectedKey) return CATEGORIES[0].rows[0].address;
    const parts = selectedKey.split("-");
    const rowIdx = parseInt(parts[parts.length - 1]);
    const cat = CATEGORIES.find(c => selectedKey.startsWith(c.id));
    return cat?.rows[rowIdx]?.address ?? CATEGORIES[0].rows[0].address;
  };

  const getSelectedLabel = (): string => {
    if (!selectedKey) return "";
    const parts = selectedKey.split("-");
    const rowIdx = parseInt(parts[parts.length - 1]);
    const cat = CATEGORIES.find(c => selectedKey.startsWith(c.id));
    return cat?.rows[rowIdx]?.label ?? "";
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

  const commitDL     = sm ? Number(sm.commit_deadline) : 0;
  const revealDL     = sm ? Number(sm.reveal_deadline)  : 0;
  const resolved     = sm ? Boolean(sm.resolved)        : false;
  const outcome      = sm ? Number(sm.outcome)          : 0;
  const hasCommitted = su ? Boolean(su.has_committed)   : false;
  const hasRevealed  = su ? Boolean(su.has_revealed)    : false;
  const hasClaimed   = su ? Boolean(su.has_claimed)     : false;

  const phase =
    commitDL === 0    ? "Loading"
    : now <= commitDL ? "Commit"
    : now <= revealDL ? "Reveal"
    : "Ended";

  const fmtTL = (dl: number) => {
    const d = dl - now; if (d <= 0) return "Ended";
    const h = Math.floor((d%86400)/3600), m = Math.floor((d%3600)/60), s = d%60;
    if (Math.floor(d/86400) > 0) return `${Math.floor(d/86400)}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s.toString().padStart(2,"0")}s`;
  };

  const handleCommit = async () => {
    if (!selectedKey)       return alert("Select a market first");
    if (!secret.trim())     return alert("Secret not generated yet — please wait a moment.");
    if (Number(stake) <= 0) return alert("Enter stake > 0");
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
    } catch (e) { console.error(e); setTxStatus("Failed. See console."); }
  };

  const handleReveal = async () => {
    const s = localStorage.getItem("shadowtrade_secret");
    const v = localStorage.getItem("shadowtrade_vote") || "1";
    if (!s) return alert("No secret found!");
    try {
      setTxStatus("⏳ Revealing...");
      await sendAsync([{ contractAddress: selectedAddress, entrypoint: "reveal", calldata: [v==="1"?"1":"2", s] }]);
      setTxStatus("✅ Revealed!");
    } catch (e) { console.error(e); setTxStatus(" Reveal failed."); }
  };

  const handleClaim = async () => {
    try {
      setTxStatus("⏳ Claiming...");
      await sendAsync([{ contractAddress: selectedAddress, entrypoint: "claim", calldata: [] }]);
      setTxStatus("✅ Claimed!");
    } catch (e) { console.error(e); setTxStatus(" Claim failed."); }
  };

  const filters = ["All", "Bitcoin", "Crypto Prices", "ATH", "Ending Soon"];
  const filteredCats = CATEGORIES.filter(cat => {
    if (searchQ && !cat.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (activeFilter === "All") return true;
    if (activeFilter === "Bitcoin") return true;
    if (activeFilter === "Crypto Prices") return cat.id === "price-targets" || cat.id === "daily-price";
    if (activeFilter === "ATH") return cat.id === "ath";
    if (activeFilter === "Ending Soon") return cat.id === "daily-price";
    return true;
  });

  
  return (
    <div className="min-h-screen text-white" style={{ background: "#0d0d0d", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .ticker { animation: ticker 28s linear infinite; }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
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
              <span>ShadowTrade <span className="text-purple-400">{TOTAL_MARKETS} Live Markets · Privacy-First</span></span>
              <span>Powered by <span className="text-amber-400">Pedersen Hash</span></span>
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
          <div className="hidden md:flex flex-1 max-w-xs">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">{<IoIosSearch />}</span>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search markets..."
                className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-amber-500/30 transition-all"/>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-500 bg-white/3 border border-white/8 rounded-lg px-2.5 py-1.5">
              <span className="text-green-400">●</span> Sepolia
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
        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                activeFilter===f ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              }`}>{f}</button>
          ))}
          <div className="ml-auto flex gap-2 shrink-0">
            {["Trending","Newest","Volume"].map(s => (
              <button key={s} className="text-xs text-gray-600 hover:text-gray-400 px-3 py-2 rounded-lg bg-white/3 border border-white/5 transition-colors">{s}</button>
            ))}
          </div>
        </div>

        {/* AI Commentary */}
        <div className="bg-white/3 border border-white/8 rounded-2xl px-5 py-3.5 mb-5 flex items-start gap-3">
          <span className="text-base shrink-0 mt-0.5">{<BsRobot/>}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-500">AI Market Commentary</span>
              <span className="text-xs font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                BTC ${btcPrice.toLocaleString()} {btcChange>=0?"▲":"▼"}{Math.abs(btcChange)}%
              </span>
              <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                {TOTAL_MARKETS} contracts live
              </span>
            </div>
            {commLoading
              ? <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
              : <p className="text-xs text-gray-400 leading-relaxed">{commentary||"Fetching analysis..."}</p>
            }
          </div>
          <button onClick={fetchCommentary} disabled={commLoading}
            className="text-xs text-gray-600 hover:text-gray-400 shrink-0 transition-colors disabled:opacity-30">↻</button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* LEFT */}
          <div className="lg:col-span-2">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Total Volume",   value: "$127M+",        sub: "across all markets"    },
                { label: "Live Contracts", value: `${TOTAL_MARKETS}`, sub: "deployed on Starknet" },
                { label: "Privacy",        value: "Pedersen Hash", sub: "commit-reveal protocol" },
              ].map(s => (
                <div key={s.label} className="bg-white/3 border  border-white/8 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className="font-black text-white text-lg leading-none">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
                </div>
              ))}
            </div>

            {filteredCats.length === 0
              ? <div className="text-center py-16 text-gray-600">No markets match "{searchQ}"</div>
              : filteredCats.map(cat => (
                <CategoryBlock key={cat.id} cat={cat}
                  selectedKey={selectedKey} selectedVote={selectedVote}
                  btcPrice={btcPrice}
                  onSelect={(key, vote) => { setSelectedKey(key); setSelectedVote(vote); }}
                />
              ))
            }
          </div>

          {/* RIGHT — sticky trade panel */}
          <div className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto space-y-4 pb-6 no-scrollbar">

            {/* Trade box */}
            <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                {selectedKey ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Selected Market</p>
                    <p className="font-bold text-white text-sm leading-snug">{getSelectedLabel()}</p>
                    {selectedVote && (
                      <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full border font-semibold ${
                        selectedVote==="1" ? "bg-green-500/10 border-green-500/20 text-green-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}>Buying {selectedVote==="1"?"YES ":"NO "}</span>
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
                    <p className="text-gray-600 text-sm">Browse markets and click YES or NO to begin</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { label: hasCommitted?"✓ Committed":"Not committed", on: hasCommitted, c:"green"  },
                        { label: hasRevealed?"✓ Revealed":"Not revealed",    on: hasRevealed,  c:"blue"   },
                        { label: hasClaimed?"✓ Claimed":"Not claimed",       on: hasClaimed,   c:"purple" },
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

                    {phase==="Commit" && !hasCommitted && (
                      <>
                        {/* Countdown banner */}
                        <CommitCountdown deadline={commitDL} />

                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setSelectedVote("1")}
                            className={`py-3 rounded-xl font-bold text-sm border transition-all ${selectedVote==="1"?"bg-green-600 border-green-500 text-white":"bg-white/3 border-white/10 text-gray-400 hover:border-green-500/30"}`}>
                            YES
                          </button>
                          <button onClick={() => setSelectedVote("2")}
                            className={`py-3 rounded-xl font-bold text-sm border transition-all ${selectedVote==="2"?"bg-red-600 border-red-500 text-white":"bg-white/3 border-white/10 text-gray-400 hover:border-red-500/30"}`}>
                            NO 
                          </button>
                        </div>
                        {/* Auto-generated secret — no user action needed */}
                        <div className="bg-black/30 border border-white/8 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-green-400">🔐</span>
                              <span className="text-xs font-semibold text-gray-400">Your Private Key</span>
                              <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">Auto-saved</span>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(secret);
                                setSecretCopied(true);
                                setTimeout(() => setSecretCopied(false), 2000);
                              }}
                              className="text-xs text-gray-600 hover:text-amber-400 transition-colors"
                            >
                              {secretCopied ? "✓ Copied!" : "Copy"}
                            </button>
                          </div>
                          <p className="text-xs font-mono text-gray-500 break-all leading-relaxed">{secret || "Generating..."}</p>
                          <p className="text-xs text-gray-700 mt-2">
                            🛡️ Generated locally · Saved in your browser · Used to prove your vote at reveal
                          </p>
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
                        <p className="text-purple-300 font-bold">{outcome===1?"✅ YES Won":" NO Won"}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* About */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-2.5">
              <p className="text-xs font-semibold text-gray-500 mb-3">About ShadowTrade</p>
              {[
                { k: "Privacy",    v: "Pedersen Hash commit-reveal" },
                { k: "Chain",      v: "Starknet Sepolia"            },
                { k: "Token",      v: "sBTC (testnet)"              },
                { k: "Resolution", v: "Admin · Pragma Oracle soon"  },
                { k: "Hackathon",  v: "Starknet Resolve 2026"       },
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
                  { n:"1", c:"amber", t:"Commit", d:"Submit hash(vote, secret). Position invisible on-chain until reveal." },
                  { n:"2", c:"blue",  t:"Reveal",  d:"After window closes, prove your vote with your secret salt." },
                  { n:"3", c:"green", t:"Claim",   d:"Winners split the losing pool. Fully trustless." },
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

      {txStatus && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
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
        ShadowTrade · Starknet Resolve Hackathon 2026 · {TOTAL_MARKETS} live contracts · Powered by Pedersen Hash · Not financial advice
      </footer>
    </div>
  );
}