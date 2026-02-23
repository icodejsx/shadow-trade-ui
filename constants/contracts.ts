export const SHADOW_TRADE_ADDRESS =
  "0x02048548a359413c764dace52c44cab112f49c0ac78761e9f6e5c91a2027803d";

export const SBTC_ADDRESS =
  "0x0493a5019b3ca8cb56fd0802851e7f33d9c32260a9a9bf761030b0855040b2ed";

export const SHADOW_TRADE_ABI = [
  {
    type: "function",
    name: "commit",
    state_mutability: "external",
    inputs: [
      { name: "commitment_hash", type: "core::felt252" },
      { name: "stake", type: "core::integer::u256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "reveal",
    state_mutability: "external",
    inputs: [
      { name: "vote", type: "core::integer::u8" },
      { name: "secret", type: "core::felt252" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "resolve",
    state_mutability: "external",
    inputs: [{ name: "outcome", type: "core::integer::u8" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    state_mutability: "external",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "get_market_info",
    state_mutability: "view",
    inputs: [],
    outputs: [
      { name: "question", type: "core::felt252" },
      { name: "commit_deadline", type: "core::integer::u64" },
      { name: "reveal_deadline", type: "core::integer::u64" },
      { name: "resolved", type: "core::bool" },
      { name: "outcome", type: "core::integer::u8" },
    ],
  },
  {
    type: "function",
    name: "get_pool_info",
    state_mutability: "view",
    inputs: [],
    outputs: [
      { name: "yes_votes", type: "core::integer::u32" },
      { name: "no_votes", type: "core::integer::u32" },
      { name: "yes_pool", type: "core::integer::u256" },
      { name: "no_pool", type: "core::integer::u256" },
    ],
  },
  {
    type: "function",
    name: "get_user_info",
    state_mutability: "view",
    inputs: [
      {
        name: "user",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
    outputs: [
      { name: "has_committed", type: "core::bool" },
      { name: "has_revealed", type: "core::bool" },
      { name: "has_claimed", type: "core::bool" },
      { name: "user_vote", type: "core::integer::u8" },
      { name: "user_stake", type: "core::integer::u256" },
    ],
  },
] as const;

export const SBTC_ABI = [
  {
    type: "function",
    name: "approve",
    state_mutability: "external",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress",
      },
      { name: "amount", type: "core::integer::u256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balance_of",
    state_mutability: "view",
    inputs: [
      {
        name: "account",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
    outputs: [{ name: "balance", type: "core::integer::u256" }],
  },
  {
    type: "function",
    name: "mint",
    state_mutability: "external",
    inputs: [
      {
        name: "recipient",
        type: "core::starknet::contract_address::ContractAddress",
      },
      { name: "amount", type: "core::integer::u256" },
    ],
    outputs: [],
  },
] as const;