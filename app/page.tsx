"use client";

import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useReadContract, useSendTransaction } from "@starknet-react/core";
import {
  SHADOW_TRADE_ADDRESS,
  SHADOW_TRADE_ABI,
  SBTC_ADDRESS,
} from "@/constants/contracts";
import { useState, useEffect } from "react";
import { hash } from "starknet";

function felt252ToString(felt: unknown): string {
  if (felt === undefined || felt === null) return "BTC > 100k?";
  try {
    const hex = BigInt(felt as bigint).toString(16);
    const padded = hex.length % 2 === 0 ? hex : "0" + hex;
    let str = "";
    for (let i = 0; i < padded.length; i += 2) {
      const code = parseInt(padded.slice(i, i + 2), 16);
      if (code > 31 && code < 127) str += String.fromCharCode(code);
    }
    return str || "BTC > 100k?";
  } catch {
    return "BTC > 100k?";
  }
}

function formatsBTC(raw: unknown): string {
  if (!raw) return "0";
  try {
    const val = BigInt(raw as bigint);
    if (val === 0n) return "0";
    return (val / BigInt("1000000000000000000")).toString();
  } catch {
    return "0";
  }
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendAsync } = useSendTransaction({ calls: [] });

  const [vote, setVote] = useState<"1" | "2">("1");
  const [secret, setSecret] = useState("");
  const [stake, setStake] = useState("100");
  const [savedSecret, setSavedSecret] = useState("");
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [txStatus, setTxStatus] = useState<string | null>(null);

  useEffect(() => {
    const iv = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("shadowtrade_secret");
    if (saved) setSavedSecret(saved);
  }, []);

  const { data: marketRaw } = useReadContract({
    address: SHADOW_TRADE_ADDRESS as `0x${string}`,
    abi: SHADOW_TRADE_ABI,
    functionName: "get_market_info",
    args: [],
    watch: true,
  });

  const { data: poolRaw } = useReadContract({
    address: SHADOW_TRADE_ADDRESS as `0x${string}`,
    abi: SHADOW_TRADE_ABI,
    functionName: "get_pool_info",
    args: [],
    watch: true,
  });

  const { data: userRaw } = useReadContract({
    address: SHADOW_TRADE_ADDRESS as `0x${string}`,
    abi: SHADOW_TRADE_ABI,
    functionName: "get_user_info",
    args: address ? [address] : undefined,
    enabled: !!address,
    watch: true,
  });

  useEffect(() => {
    console.log("marketRaw:", marketRaw);
    console.log("poolRaw:", poolRaw);
    console.log("userRaw:", userRaw);
  }, [marketRaw, poolRaw, userRaw]);

  const m = marketRaw as Record<string, unknown> | undefined;
  const p = poolRaw as Record<string, unknown> | undefined;
  const u = userRaw as Record<string, unknown> | undefined;

  const question      = m ? felt252ToString(m.question)  : "Loading...";
  const commitDeadline = m ? Number(m.commit_deadline)   : 0;
  const revealDeadline = m ? Number(m.reveal_deadline)   : 0;
  const resolved      = m ? Boolean(m.resolved)          : false;
  const outcome       = m ? Number(m.outcome)            : 0;

  const yesVotes = p ? Number(p.yes_votes)    : 0;
  const noVotes  = p ? Number(p.no_votes)     : 0;
  const yesPool  = p ? formatsBTC(p.yes_pool) : "0";
  const noPool   = p ? formatsBTC(p.no_pool)  : "0";

  const hasCommitted = u ? Boolean(u.has_committed) : false;
  const hasRevealed  = u ? Boolean(u.has_revealed)  : false;
  const hasClaimed   = u ? Boolean(u.has_claimed)   : false;

  const phase =
    commitDeadline === 0    ? "Loading"
    : now <= commitDeadline ? "Commit"
    : now <= revealDeadline ? "Reveal"
    : "Ended";

  const formatTimeLeft = (deadline: number) => {
    const diff = deadline - now;
    if (diff <= 0) return "Ended";
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const handleCommit = async () => {
    if (!secret.trim()) return alert("Enter a secret (e.g. 0x7a3f...)");
    if (!stake || Number(stake) <= 0) return alert("Enter a stake > 0");

    const voteHex = vote === "1" ? "0x1" : "0x2";
    const commitment = hash.computePedersenHash(voteHex, secret);

    localStorage.setItem("shadowtrade_secret", secret);
    localStorage.setItem("shadowtrade_vote", vote);
    setSavedSecret(secret);

    try {
      setTxStatus("⏳ Approving and committing... confirm in wallet");
      await sendAsync([
        {
          contractAddress: SBTC_ADDRESS,
          entrypoint: "approve",
          calldata: [SHADOW_TRADE_ADDRESS, stake, "0"],
        },
        {
          contractAddress: SHADOW_TRADE_ADDRESS,
          entrypoint: "commit",
          calldata: [commitment, stake, "0"],
        },
      ]);
      setTxStatus("✅ Committed! Secret saved. Come back during Reveal phase.");
    } catch (e) {
      console.error(e);
      setTxStatus("❌ Transaction failed. See console for details.");
    }
  };

  const handleReveal = async () => {
    const storedSecret = localStorage.getItem("shadowtrade_secret");
    const storedVote   = localStorage.getItem("shadowtrade_vote") || vote;
    if (!storedSecret) return alert("No secret found! Did you commit from this browser?");

    try {
      setTxStatus("⏳ Revealing vote... confirm in wallet");
      await sendAsync([
        {
          contractAddress: SHADOW_TRADE_ADDRESS,
          entrypoint: "reveal",
          calldata: [storedVote === "1" ? "1" : "2", storedSecret],
        },
      ]);
      setTxStatus("✅ Vote revealed successfully!");
    } catch (e) {
      console.error(e);
      setTxStatus("❌ Reveal failed. See console.");
    }
  };

  const handleClaim = async () => {
    try {
      setTxStatus("⏳ Claiming winnings... confirm in wallet");
      await sendAsync([
        {
          contractAddress: SHADOW_TRADE_ADDRESS,
          entrypoint: "claim",
          calldata: [],
        },
      ]);
      setTxStatus("✅ Winnings claimed!");
    } catch (e) {
      console.error(e);
      setTxStatus("❌ Claim failed. See console.");
    }
  };

  const phaseStyle: Record<string, string> = {
    Commit:  "text-yellow-400 bg-yellow-900/20 border-yellow-500/30",
    Reveal:  "text-blue-400 bg-blue-900/20 border-blue-500/30",
    Ended:   "text-red-400 bg-red-900/20 border-red-500/30",
    Loading: "text-gray-400 bg-white/5 border-white/10",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 md:p-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-pink-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-900/30 border border-purple-500/30 rounded-full px-4 py-1 text-sm text-purple-300 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            Live on Starknet Sepolia
          </div>
          <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
            ShadowTrade
          </h1>
          <p className="text-gray-400 text-sm">
            Private BTC Prediction Market • Commit-Reveal Protocol
          </p>
        </div>

        {/* Wallet */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 mb-4">
          {!isConnected ? (
            <div>
              <p className="text-gray-300 font-medium mb-3">Connect wallet to participate</p>
              <div className="flex flex-col gap-2">
                {connectors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => connect({ connector: c })}
                    className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    Connect {c.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400 mb-1">Connected</p>
                <p className="font-mono text-sm text-green-400">
                  {address?.slice(0, 10)}...{address?.slice(-6)}
                </p>
              </div>
              <button
                onClick={() => disconnect()}
                className="text-sm text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-400/30 rounded-lg px-3 py-1.5 transition-all"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Market Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Market Question</p>
              <h2 className="text-xl font-bold">{question}</h2>
            </div>
            <span className={`text-xs font-bold rounded-lg px-3 py-1.5 border ${phaseStyle[phase] ?? phaseStyle.Loading}`}>
              {phase} Phase
            </span>
          </div>

          {phase === "Commit" && (
            <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
              <p className="text-sm text-yellow-300">
                ⏱ Commit closes in:{" "}
                <span className="font-mono font-bold">{formatTimeLeft(commitDeadline)}</span>
              </p>
            </div>
          )}
          {phase === "Reveal" && (
            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-3 mb-4">
              <p className="text-sm text-blue-300">
                ⏱ Reveal closes in:{" "}
                <span className="font-mono font-bold">{formatTimeLeft(revealDeadline)}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-900/20 border border-green-500/20 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">YES Pool</p>
              <p className="text-lg font-bold text-green-400">{yesVotes} votes</p>
              <p className="text-xs text-gray-500">{yesPool} sBTC</p>
            </div>
            <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">NO Pool</p>
              <p className="text-lg font-bold text-red-400">{noVotes} votes</p>
              <p className="text-xs text-gray-500">{noPool} sBTC</p>
            </div>
          </div>

          {resolved && (
            <div className="mt-4 bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 text-center">
              <p className="text-purple-300 text-sm mb-1">Market Resolved</p>
              <p className="text-2xl font-black">{outcome === 1 ? "✅ YES wins!" : "❌ NO wins!"}</p>
            </div>
          )}
        </div>

        {/* Action Card */}
        {isConnected && (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 mb-4">
            <h3 className="font-bold text-gray-200 mb-4">Your Position</h3>

            <div className="flex gap-2 mb-4 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full border ${hasCommitted ? "bg-green-900/30 border-green-500/30 text-green-400" : "bg-white/5 border-white/10 text-gray-500"}`}>
                {hasCommitted ? "✓ Committed" : "Not committed"}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full border ${hasRevealed ? "bg-blue-900/30 border-blue-500/30 text-blue-400" : "bg-white/5 border-white/10 text-gray-500"}`}>
                {hasRevealed ? "✓ Revealed" : "Not revealed"}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full border ${hasClaimed ? "bg-purple-900/30 border-purple-500/30 text-purple-400" : "bg-white/5 border-white/10 text-gray-500"}`}>
                {hasClaimed ? "✓ Claimed" : "Not claimed"}
              </span>
            </div>

            {/* COMMIT FORM */}
            {phase === "Commit" && !hasCommitted && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Your Prediction</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setVote("1")}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all border ${vote === "1" ? "bg-green-600 border-green-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-green-500/40"}`}
                    >
                      YES ✅
                    </button>
                    <button
                      onClick={() => setVote("2")}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all border ${vote === "2" ? "bg-red-600 border-red-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-red-500/40"}`}
                    >
                      NO ❌
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Secret <span className="text-yellow-400 text-xs">⚠️ You need this to reveal!</span>
                  </label>
                  <input
                    type="text"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="e.g. 0x7a3f9c2b..."
                    className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-all font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Private salt — your vote is hidden until reveal.</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Stake (sBTC)</label>
                  <input
                    type="number"
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    min="1"
                    placeholder="100"
                    className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-all"
                  />
                </div>

                <button
                  onClick={handleCommit}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all"
                >
                  🔒 Commit Vote
                </button>
              </div>
            )}

            {phase === "Commit" && hasCommitted && (
              <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                <p className="text-yellow-300 font-medium">✓ Commitment recorded</p>
                <p className="text-gray-400 text-sm mt-1">Wait for the Reveal phase, then return here.</p>
              </div>
            )}

            {phase === "Reveal" && hasCommitted && !hasRevealed && (
              <div className="space-y-3">
                <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-3 text-sm">
                  <p className="text-blue-300">
                    Saved secret:{" "}
                    <span className="font-mono text-xs text-gray-400">
                      {savedSecret ? savedSecret.slice(0, 16) + "..." : "⚠️ Not found — same browser required"}
                    </span>
                  </p>
                </div>
                <button
                  onClick={handleReveal}
                  className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all"
                >
                  👁️ Reveal My Vote
                </button>
              </div>
            )}

            {resolved && hasRevealed && !hasClaimed && (
              <button
                onClick={handleClaim}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all"
              >
                💰 Claim Winnings
              </button>
            )}

            {hasClaimed && (
              <div className="bg-green-900/20 border border-green-500/20 rounded-xl p-4 text-center">
                <p className="text-green-300 font-bold text-lg">🎉 Winnings Claimed!</p>
              </div>
            )}

            {phase === "Ended" && !resolved && (
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Market ended. Waiting for admin to resolve.</p>
              </div>
            )}
          </div>
        )}

        {txStatus && (
          <div className={`rounded-xl p-4 text-sm text-center border mb-4 ${
            txStatus.startsWith("✅") ? "bg-green-900/20 border-green-500/30 text-green-300"
            : txStatus.startsWith("❌") ? "bg-red-900/20 border-red-500/30 text-red-300"
            : "bg-purple-900/20 border-purple-500/30 text-purple-300 animate-pulse"
          }`}>
            {txStatus}
          </div>
        )}

        <div className="bg-white/3 border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">🛡️ How the Privacy Works</h3>
          <div className="space-y-2 text-xs text-gray-500">
            <p><span className="text-purple-400 font-medium">1. Commit</span> — You submit <code className="text-gray-400 bg-white/5 px-1 rounded">hash(vote, secret)</code>. Nobody sees your vote on-chain.</p>
            <p><span className="text-blue-400 font-medium">2. Reveal</span> — After the commit window, you reveal vote + secret. Contract verifies the hash matches.</p>
            <p><span className="text-green-400 font-medium">3. Claim</span> — Winners split the losers&apos; stake proportionally.</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6 pb-8">
          Built for Starknet Resolve Hackathon • Powered by Pedersen Hash
        </p>
      </div>
    </div>
  );
}