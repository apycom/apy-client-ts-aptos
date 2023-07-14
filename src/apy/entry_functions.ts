import type { Types, MaybeHexString, BCS } from "aptos";

/**
 * Deposit an asset
 */
export const deposit = (
  apyAddress: MaybeHexString,
  coin: Types.MoveType,
  marketId: BCS.Uint64,
  amount: BCS.Uint64,
): Types.EntryFunctionPayload => ({
  function: `${apyAddress}::apy::deposit`,
  type_arguments: [coin],
  arguments: [
    marketId,
    amount,
  ],
});

/**
 * Withdraw an asset
 */
export const withdraw = (
  apyAddress: MaybeHexString,
  coin: Types.MoveType,
  marketId: BCS.Uint64,
  amount: BCS.Uint64,
): Types.EntryFunctionPayload => ({
  function: `${apyAddress}::apy::withdraw`,
  type_arguments: [coin],
  arguments: [
    marketId,
    amount,
  ],
});

const rate2optional = (rate?: BCS.Uint64): BCS.Uint64 => {
  if (rate) {
    return rate
  } else {
    return 0n
  }
};

/**
 * Lend assets at specified rate
 */
export const lend = (
  apyAddress: MaybeHexString,
  marketId: BCS.Uint64,
  size: BCS.Uint64,
  rate?: BCS.Uint64
): Types.EntryFunctionPayload => ({
  function: `${apyAddress}::apy::lend`,
  type_arguments: [],
  arguments: [
    marketId,
    size,
    rate2optional(rate)
  ],
});

/**
 * Cancel all signer's lend open orders for specified market
 */
export const lend_cancel = (
  apyAddress: MaybeHexString,
  marketId: BCS.Uint64,
): Types.EntryFunctionPayload => ({
  function: `${apyAddress}::apy::lend_cancel`,
  type_arguments: [],
  arguments: [
    marketId,
  ],
});

/**
 * Borrow assets at specified rate
 */
export const borrow = (
  apyAddress: MaybeHexString,
  marketId: BCS.Uint64,
  size: BCS.Uint64,
  rate?: BCS.Uint64
): Types.EntryFunctionPayload => ({
  function: `${apyAddress}::apy::borrow`,
  type_arguments: [],
  arguments: [
    marketId,
    size,
    rate2optional(rate)
  ],
});

/**
 * Cancel all signer's borrow open orders for specified market
 */
export const borrow_cancel = (
  apyAddress: MaybeHexString,
  marketId: BCS.Uint64,
): Types.EntryFunctionPayload => ({
  function: `${apyAddress}::apy::borrow_cancel`,
  type_arguments: [],
  arguments: [
    marketId,
  ],
});

/**
 * Repay borrow contracts using assets in market account
 */
export const repay_from_market_account = (
  apyAddress: MaybeHexString,
  marketId: BCS.Uint64,
  amount: BCS.Uint64,
): Types.EntryFunctionPayload => ({
  function: `${apyAddress}::apy::repay_from_market_account`,
  type_arguments: [],
  arguments: [
    marketId,
    amount,
  ],
});

/**
 * Repay borrow contract from user coinstore
 */
export const repay_from_coinstore = (
  apyAddress: MaybeHexString,
  marketId: BCS.Uint64,
  coin: Types.MoveType,
  amount: BCS.Uint64,
): Types.EntryFunctionPayload => ({
  function: `${apyAddress}::apy::repay_from_coinstore`,
  type_arguments: [coin],
  arguments: [
    marketId,
    amount,
  ],
});

/**
 * Repay borrow contracts and re-borrow them again but at market rate
 */
export const reroll = (
  apyAddress: MaybeHexString,
  marketId: BCS.Uint64,
  max_contracts: BCS.Uint64,
): Types.EntryFunctionPayload => ({
  function: `${apyAddress}::apy::borrow_reroll`,
  type_arguments: [],
  arguments: [
    marketId,
    max_contracts,
  ],
});


/**
 * Claim loan of overdue contracts
 */
export const claim_loans = (
  apyAddress: MaybeHexString,
  userAddress: MaybeHexString,
  marketId: BCS.Uint64,
  maxContracts: BCS.Uint64,
): Types.EntryFunctionPayload => ({
  function: `${apyAddress}::apy::claim_loans`,
  type_arguments: [],
  arguments: [
    userAddress,
    marketId,
    maxContracts,
  ],
});
