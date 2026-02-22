"use client";

import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useReadContract, useSendTransaction } from "@starknet-react/core";
import { SHADOW_TRADE_ADDRESS, SHADOW_TRADE_ABI, SBTC_ADDRESS, SBTC_ABI } from "@/constants/contracts";
import { useState, useEffect } from "react";
import { hash } from "starknet";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendAsync } = useSendTransaction({});

  const [vote, setVote] = useState<"1" | "2">("1");
  const [secret, setSecret] = useState("");
  const [stake, setStake] = useState("100");
  const [savedSecret, setSavedSecret] = useState("");

  // Read market info
  const { data: marketInfo } = useReadContract({
    address: SHADOW_TRADE_ADDRESS,
    abi: SHADOW_TRADE_ABI,
    functionName: "get_market_info",
    args: [],
    watch: true,
  });

  // Read pool info
  const { data: poolInfo } = useReadContract({
    address: SHADOW_TRADE_ADDRESS,
    abi: SHADOW_TRADE_ABI,
    functionName: "get_pool_info",
    args: [],
    watch: true,
  });

  // Read user info
  const { data: userInfo } = useReadContract({
    address: SHADOW_TRADE_ADDRESS,
    abi: SHADOW_TRADE_ABI,
    functionName: "get_user_info",
    args: address ? [address] : undefined,
    watch: true,
  });

  // Load saved secret from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("shadowtrade_secret");
    if (saved) setSavedSecret(saved);
  }, []);

  const handleCommit = async () => {
    if (!secret || !stake) return alert("Enter secret and stake");

    // Generate commitment hash
    const voteNum = vote === "1" ? "0x1" : "0x2";
    const commitment = hash.computePedersenHash(voteNum, secret);

    // Save secret
    localStorage.setItem("shadowtrade_secret", secret);
    setSavedSecret(secret);

    try {
      // Approve + Commit in multicall
      await sendAsync({
        calls: [
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
        ],
      });

      alert("Committed! Secret saved: " + secret);
    } catch (e) {
      console.error(e);
      alert("Transaction failed");
    }
  };

  const handleReveal = async () => {
    if (!savedSecret) return alert("No secret found. Did you commit?");

    try {
      await sendAsync({
        calls: [
          {
            contractAddress: SHADOW_TRADE_ADDRESS,
            entrypoint: "reveal",
            calldata: [vote === "1" ? "1" : "2", savedSecret],
          },
        ],
      });

      alert("Revealed!");
    } catch (e) {
      console.error(e);
      alert("Transaction failed");
    }
  };

  const handleClaim = async () => {
    try {
      await sendAsync({
        calls: [
          {
            contractAddress: SHADOW_TRADE_ADDRESS,
            entrypoint: "claim",
            calldata: [],
          },
        ],
      });

      alert("Claimed winnings!");
    } catch (e) {
      console.error(e);
      alert("Transaction failed");
    }
  };

  // Parse market data
// Parse market data with proper types
// Parse market data with proper types
const question = marketInfo ? String((marketInfo as any)[0]) : "Loading...";
const commitDeadline = marketInfo ? Number((marketInfo as any)[1]) : 0;
const revealDeadline = marketInfo ? Number((marketInfo as any)[2]) : 0;
const resolved = marketInfo ? (marketInfo as any)[3] : false;
const outcome = marketInfo ? Number((marketInfo as any)[4]) : 0;

const yesVotes = poolInfo ? Number((poolInfo as any)[0]) || 0 : 0;
const noVotes = poolInfo ? Number((poolInfo as any)[1]) || 0 : 0;

const hasCommitted = userInfo ? (userInfo as any)[0] : false;
const hasRevealed = userInfo ? (userInfo as any)[1] : false;
const hasClaimed = userInfo ? (userInfo as any)[2] : false;

const [now, setNow] = useState(Math.floor(Date.now() / 1000));

useEffect(() => {
  const interval = setInterval(() => {
    setNow(Math.floor(Date.now() / 1000));
  }, 1000);
  return () => clearInterval(interval);
}, []);

const phase =
  now <= commitDeadline
    ? "Commit"
    : now <= revealDeadline
    ? "Reveal"
    : "Ended";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          ShadowTrade
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Private BTC Prediction Market on Starknet
        </p>

        {/* Wallet Connection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-purple-500">
          {!isConnected ? (
            <div className="space-y-2">
              <p className="text-gray-300 mb-3">Connect your wallet to participate</p>
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition"
                >
                  Connect {connector.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <p className="text-gray-300">
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              <button
                onClick={() => disconnect()}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Market Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-purple-500">
          <h2 className="text-2xl font-bold mb-4">Market Question</h2>
          <p className="text-xl text-purple-300 mb-4">{question}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Phase</p>
              <p className="text-lg font-bold text-purple-400">{phase}</p>
            </div>
            <div>
              <p className="text-gray-400">Status</p>
              <p className="text-lg font-bold">{resolved ? "Resolved" : "Active"}</p>
            </div>
            <div>
              <p className="text-gray-400">YES Votes</p>
              <p className="text-lg font-bold text-green-400">{yesVotes}</p>
            </div>
            <div>
              <p className="text-gray-400">NO Votes</p>
              <p className="text-lg font-bold text-red-400">{noVotes}</p>
            </div>
          </div>
          {resolved && (
            <div className="mt-4 p-3 bg-purple-900 rounded">
              <p className="text-center font-bold">
                Winner: {outcome === 1 ? "YES" : "NO"}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {isConnected && (
          <div className="bg-gray-800 rounded-lg p-6 border border-purple-500">
            <h2 className="text-2xl font-bold mb-4">Your Actions</h2>

            {/* Commit Phase */}
            {phase === "Commit" && !hasCommitted && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Your Prediction</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setVote("1")}
                      className={`flex-1 py-3 rounded-lg font-bold transition ${
                        vote === "1"
                          ? "bg-green-600 text-white"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      onClick={() => setVote("2")}
                      className={`flex-1 py-3 rounded-lg font-bold transition ${
                        vote === "2"
                          ? "bg-red-600 text-white"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">
                    Secret (save this!)
                  </label>
                  <input
                    type="text"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="0x123abc..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">
                    Stake (sBTC)
                  </label>
                  <input
                    type="number"
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    placeholder="100"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                  />
                </div>

                <button
                  onClick={handleCommit}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Commit Vote
                </button>
              </div>
            )}

            {/* Reveal Phase */}
            {phase === "Reveal" && hasCommitted && !hasRevealed && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  Saved Secret: {savedSecret || "Not found"}
                </p>
                <button
                  onClick={handleReveal}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Reveal Vote
                </button>
              </div>
            )}

            {/* Claim Phase */}
            {resolved && hasRevealed && !hasClaimed && (
              <button
                onClick={handleClaim}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
              >
                Claim Winnings
              </button>
            )}

            {/* Status Messages */}
            {hasCommitted && <p className="text-green-400">✓ You have committed</p>}
            {hasRevealed && <p className="text-green-400">✓ You have revealed</p>}
            {hasClaimed && <p className="text-green-400">✓ You have claimed</p>}
          </div>
        )}
      </div>
    </div>
  );
}