/* eslint-disable @typescript-eslint/no-explicit-any*/
import { FailedTransactionError, FaucetClient, MaybeHexString, getAddressFromAccountOrAddress } from "aptos"
import { HexString, Types } from "aptos"
import { AptosAccount, AptosClient, BCS } from "aptos"
import { ApyClient, Apy, AccountProvider } from "../apy"
import type { Contracts, MarketAccount } from "../types"

import "./bigint.extension"

export function isSet<T>(val?: T): T {
  if (val === undefined) {
    throw new Error("value is unknown")
  }
  return val
}
const NODE_URL = isSet(process.env.APTOS_NODE_URL);
const FAUCET_URL = isSet(process.env.APTOS_FAUCET_URL);

const to_account = (privateKeyHex?: string, address?: string): AptosAccount => {
  if (privateKeyHex === undefined) {
    throw new Error("private key is not set")
  }
  return AptosAccount.fromAptosAccountObject({
    address,
    privateKeyHex
  })
}

export const USDC = to_account(process.env.USDC, process.env.USDC_ADDRESS)
export const BTC = to_account(process.env.BTC, process.env.BTC_ADDRESS)
export const ETH = to_account(process.env.ETH, process.env.ETH_ADDRESS)

export const PYTH = to_account(process.env.PYTH, process.env.PYTH_ADDRESS)
export const APY = to_account(process.env.APY, process.env.APY_ADDRESS)

export const USDC_PRICE_ID = new HexString('0100000000000000000000000000000000000000000000000000000000000000')
export const BTC_PRICE_ID = new HexString('0200000000000000000000000000000000000000000000000000000000000000')
export const ETH_PRICE_ID = new HexString('0300000000000000000000000000000000000000000000000000000000000000')

class ApyTestClient extends ApyClient {
  public constructor(
    client: AptosClient,
    signer: AptosAccount,
    apyAddress: MaybeHexString,
  ) {
    super(new AccountProvider(client, signer), apyAddress)
  }

  with(signer: AptosAccount): ApyTestClient {
    this.provider = (this.provider as AccountProvider).with(signer)
    return this
  }
}

export const checkResult = async (client: AptosClient, tx: Promise<Types.PendingTransaction>) => {
  const pendingTx = await tx
  await client.waitForTransactionWithResult(
    pendingTx.hash, { checkSuccess: true }
  );
}

export function getCoinType(account: AptosAccount): string {
  return `${account.address().hex()}::coin::TestCoin`
}

export async function mintCoin(client: AptosClient, account: AptosAccount, to: AptosAccount, amount: BCS.Uint64): Promise<void> {
  const provider = new AccountProvider(client, to)
  await provider.submitTx(
    {
      function: `0x01::managed_coin::register`,
      type_arguments: [
        getCoinType(account)
      ],
      arguments: []
    }
  )

  const tx = await provider.with(account).submitTx(
    {
      function: `0x01::managed_coin::mint`,
      type_arguments: [
        getCoinType(account)
      ],
      arguments: [
        to.address(),
        amount,
      ]
    }
  )

  if (!(tx as Types.UserTransaction)?.success) {
    throw new FailedTransactionError(
      `Transaction ${tx.hash} committed to the blockchain but execution failed`,
      tx,
    );
  }
}

export async function fetchCoinStoreBalance(client: AptosClient, account: AptosAccount | MaybeHexString, coinType: Types.MoveType): Promise<bigint> {
  const typeTag = `0x1::coin::CoinStore%3C${coinType}%3E`;
  const address = getAddressFromAccountOrAddress(account);
  const accountResource = await client.getAccountResource(address, typeTag);

  return BigInt((accountResource.data as any).coin.value);
}


export function getFaucetClient(): FaucetClient {
  const config: Partial<Types.OpenAPIConfig> = {};
  if (process.env.FAUCET_AUTH_TOKEN) {
    config.HEADERS = { Authorization: `Bearer ${process.env.FAUCET_AUTH_TOKEN}` };
  }
  return new FaucetClient(NODE_URL, FAUCET_URL, config);
}

export function getAptosClient(): AptosClient {
  return new AptosClient(NODE_URL);
}

export function getApyClient(signer: AptosAccount, client?: AptosClient): ApyTestClient {
  if (client === undefined) {
    client = getAptosClient()
  }
  return new ApyTestClient(client, signer, APY.address())
}

export async function getApy(): Promise<Apy> {
  const apy = new Apy(APY.address())
  await apy.updateMarkets(new AptosClient(NODE_URL))
  return apy
}

export async function updatePythPrice(client: AptosClient, price_id: HexString, value: BCS.Uint64, exp: number, conf?: BCS.Uint64): Promise<void> {
  const provider = new AccountProvider(client, PYTH)

  const tx = await provider.submitTx(
    {
      function: `${PYTH.address().hex()}::pyth::update`,
      type_arguments: [],
      arguments: [
        price_id.toUint8Array(),
        value,
        exp,
        conf ?? 100n
      ]
    }
  )

  if (!(tx as Types.UserTransaction)?.success) {
    throw new FailedTransactionError(
      `Transaction ${tx.hash} committed to the blockchain but execution failed`,
      tx,
    );
  }
}

export async function fetchMarketAccount(client: AptosClient, account: MaybeHexString, market_id: BCS.Uint64): Promise<MarketAccount> {
  const apyAddress = APY.address().hex()
  const typeTag = `${apyAddress}::user::MarketAccounts`;
  const address = getAddressFromAccountOrAddress(account);
  const mi = (market_id << 64n) + 1n

  let marketsHandle: string

  try {
    const accountResource = await client.getAccountResource(address, typeTag);
    marketsHandle = (accountResource.data as any).map.handle
  } catch (e) {
    return {
      base_total: 0n,
      quote_total: 0n,
      base_available: 0n,
      quote_available: 0n,
    }
  }

  const ma = (await client.getTableItem(marketsHandle, {
    key_type: 'u128',
    value_type: `${apyAddress}::user::MarketAccount`,
    key: `${mi}`
  })) as any;


  return {
    base_total: BigInt(ma.base_total),
    base_available: BigInt(ma.base_available),
    quote_total: BigInt(ma.quote_total),
    quote_available: BigInt(ma.quote_available),
  }
}

type Loans = {
  market_ids: Array<bigint>,
  lend: string,
  borrow: string,
}

export async function fetchMarkets(
  client: AptosClient,
  account: MaybeHexString,
): Promise<Loans> {

  const apyAddress = APY.address().hex()
  const typeTag = `${apyAddress}::user::Loans`
  const accountResource = await client.getAccountResource(account, typeTag);
  const data = (accountResource as any).data

  const market_ids = data.market_ids.map((i: string) => BigInt(i))

  return {
    market_ids, lend: data.lend_side.handle, borrow: data.borrow_side.handle
  }
}

const marketToContract = async (client: AptosClient, handle: string, market_id: BCS.Uint64): Promise<Contracts> => {

  const apyAddress = APY.address().hex()

  const loanside = (await client.getTableItem(handle, {
    key_type: 'u64',
    value_type: `${apyAddress}::user::LoansSide`,
    key: `${market_id}`
  })) as any;

  const contracts = loanside.contracts.map((c: any) => ({
    maturity: new Date(Number(c.maturity_timestamp) * 1000),
    principal: BigInt(c.principal_amount),
    interest: BigInt(c.annual_interest_amount)
  }))

  return {
    contracts,
    total_principal: BigInt(loanside.counters.sum_principal_amount),
    totall_interest: BigInt(loanside.counters.sum_annual_interest_amount),
    repaid_or_claimed: BigInt(loanside.counters.repaid_or_claimed)
  }
}

export async function fetchBorrowMarketContracts(
  client: AptosClient,
  account: MaybeHexString,
  market_id: BCS.Uint64): Promise<Contracts> {

  const loans = await fetchMarkets(
    client,
    account
  )

  return marketToContract(client, loans.borrow, market_id)
}

export async function fetchLendMarketContracts(
  client: AptosClient,
  account: MaybeHexString,
  market_id: BCS.Uint64): Promise<Contracts> {

  const loans = await fetchMarkets(
    client,
    account
  )

  return marketToContract(client, loans.lend, market_id)
}

export const longTestTimeout = 120 * 1000;
