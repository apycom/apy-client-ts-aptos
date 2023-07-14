
import { AptosAccount } from "aptos"
import {
  ETH, USDC, BTC, USDC_PRICE_ID, BTC_PRICE_ID, ETH_PRICE_ID, getAptosClient, getApy,
  getApyClient, getCoinType, getFaucetClient, fetchMarketAccount,
  isSet, longTestTimeout, mintCoin, fetchCoinStoreBalance, updatePythPrice,
  checkResult,
  fetchBorrowMarketContracts,
  fetchLendMarketContracts
} from "./helper"
import { Apy } from "../apy";
import { Market } from "../types";

const alice = new AptosAccount();
const bob = new AptosAccount();
const ALICE_ADDRESS = alice.address();
const BOB_ADDRESS = bob.address();
//const DOMAIN_NAME = Math.random().toString(36).slice(2);

describe("Deposit and Withdraw", () => {
  let apy: Apy
  let usdcMarket: Market
  let ethMarket: Market
  let btcMarket: Market

  beforeAll(async () => {

    const faucetClient = getFaucetClient();
    await faucetClient.fundAccount(ALICE_ADDRESS, 100_000_000_000);
    await faucetClient.fundAccount(BOB_ADDRESS, 100_000_000_000);

    console.log(`alice ${ALICE_ADDRESS}`)
    console.log(`bob ${BOB_ADDRESS}`)

    apy = await getApy()

    usdcMarket = isSet(apy.getMarketByCoinPeriod(getCoinType(USDC), "Hour"))
    ethMarket = isSet(apy.getMarketByCoinPeriod(getCoinType(ETH), "Hour"))
    btcMarket = isSet(apy.getMarketByCoinPeriod(getCoinType(BTC), "Hour"))

    const client = getAptosClient();
    await updatePythPrice(client, USDC_PRICE_ID, 999960n, 6)
    await updatePythPrice(client, BTC_PRICE_ID, 265250000n, 4)
    await updatePythPrice(client, ETH_PRICE_ID, 173179000n, 5)

  }, longTestTimeout);

  test("deposit", async () => {
    const client = getAptosClient();
    const amount = 1_00_000_000n
    await mintCoin(client, USDC, alice, amount)
    await mintCoin(client, ETH, bob, amount)

    {
      const apyClient = getApyClient(alice, client)
      await checkResult(client, apyClient.deposit(usdcMarket, amount))

      console.log(`deposit ${amount} USDC to ${ALICE_ADDRESS}`)

      const balance = await fetchCoinStoreBalance(client, alice, usdcMarket.base.coin)
      expect(balance).toBe(0n)
    }

    {
      const apyClient = getApyClient(bob, client)
      await checkResult(client, apyClient.deposit(ethMarket, amount))

      console.log(`deposit ${amount} ETH to ${BOB_ADDRESS}`)

      const balance = await fetchCoinStoreBalance(client, bob, ethMarket.base.coin)
      expect(balance).toBe(0n)
    }
  }, longTestTimeout);

  test("withdraw", async () => {
    const client = getAptosClient();
    const amount = 1_00_000_000n
    await mintCoin(client, BTC, alice, amount)

    const apyClient = getApyClient(alice, client)
    await checkResult(client, apyClient.deposit(btcMarket, amount))

    console.log(`deposit ${amount} BTC to ${ALICE_ADDRESS}`)

    let balance = await fetchCoinStoreBalance(client, ALICE_ADDRESS.hex(), btcMarket.base.coin)
    expect(balance).toBe(0n)

    await checkResult(client, apyClient.withdraw(btcMarket, amount))

    balance = await fetchCoinStoreBalance(client, alice, btcMarket.base.coin)

    console.log(`balance ${balance}`)
    expect(balance).toBe(amount)

  }, longTestTimeout)

  test("lend & cancel", async () => {
    const client = getAptosClient();
    const amount = 1_00_000_000n
    await mintCoin(client, BTC, alice, amount)

    const apyClient = getApyClient(alice, client)
    await checkResult(client, apyClient.deposit(btcMarket, amount))

    const marketAccountBefore = await fetchMarketAccount(client, ALICE_ADDRESS, btcMarket.market_id)

    await checkResult(client, apyClient.lend(btcMarket, amount, 1.0)) // 1%
    const marketAccountAfter = await fetchMarketAccount(client, ALICE_ADDRESS, btcMarket.market_id)

    expect(marketAccountBefore.base_total).toBe(marketAccountAfter.base_total)
    expect(marketAccountBefore.base_available - marketAccountAfter.base_available).toBe(amount)
    //cancel

    await checkResult(client, apyClient.lend_cancel(btcMarket))

    const marketAccountCanceled = await fetchMarketAccount(client, ALICE_ADDRESS, btcMarket.market_id)

    expect(marketAccountBefore.base_total).toBe(marketAccountCanceled.base_total)
    expect(marketAccountBefore.base_available).toBe(marketAccountCanceled.base_available)

  }, longTestTimeout)

  test("borrow", async () => {
    const client = getAptosClient();
    let amount = 1_00_000_000n
    await mintCoin(client, BTC, alice, amount)

    const apyClient = getApyClient(alice, client)
    await checkResult(client, apyClient.deposit(btcMarket, amount))
    await checkResult(client, apyClient.lend(btcMarket, amount, 1.0)) // 1%

    // deposit 10_000 usdc as a collateral
    amount = 10_000_00_000_000n
    await mintCoin(client, USDC, bob, amount)

    apyClient.with(bob)
    await checkResult(client, apyClient.deposit(usdcMarket, amount))
    // borrow 
    await checkResult(client, apyClient.borrow(btcMarket, 1_000_000n, 0)) // 0.01 BTC market 1%

    const marketAccount = await fetchMarketAccount(client, BOB_ADDRESS, btcMarket.market_id)
    expect(marketAccount.base_total).toBe(1_000_000n)
  }, longTestTimeout)


  test("borrow cancel", async () => {
    const client = getAptosClient();
    const apyClient = getApyClient(alice, client)
    // clear lender orderbook

    let marketAccount = await fetchMarketAccount(client, ALICE_ADDRESS, btcMarket.market_id)
    if (marketAccount.base_available != marketAccount.base_total) {
      await checkResult(client, apyClient.lend_cancel(btcMarket))
    }

    // deposit and borrow
    const amount = 10_000_00_000_000n
    await mintCoin(client, USDC, bob, amount)

    apyClient.with(bob)
    await checkResult(client, apyClient.deposit(usdcMarket, amount))
    // borrow ETH 
    await checkResult(client, apyClient.borrow(ethMarket, 1_000_000n, 1.0)) // 0.01 ETH 1%

    marketAccount = await fetchMarketAccount(client, BOB_ADDRESS, ethMarket.market_id)

    expect(marketAccount.base_total).toBe(0n)
    expect(marketAccount.base_available).toBe(0n)
    expect(marketAccount.quote_total).toBe(10_000n)
    expect(marketAccount.quote_available).toBe(0n)

    await checkResult(client, apyClient.borrow_cancel(ethMarket))
    marketAccount = await fetchMarketAccount(client, BOB_ADDRESS, ethMarket.market_id)

    expect(marketAccount.base_total).toBe(0n)
    expect(marketAccount.base_available).toBe(0n)
    expect(marketAccount.quote_total).toBe(0n)
    expect(marketAccount.quote_available).toBe(0n)

  }, longTestTimeout)

  test("borrow repay", async () => {
    const client = getAptosClient();
    let amount = 1_00_000_000n
    await mintCoin(client, BTC, alice, amount)

    const apyClient = getApyClient(alice, client)
    await checkResult(client, apyClient.deposit(btcMarket, amount))
    await checkResult(client, apyClient.lend(btcMarket, amount, 1)) // 1%

    // deposit 10_000 usdc as a collateral
    amount = 10_000_00_000_000n
    await mintCoin(client, USDC, bob, amount)

    apyClient.with(bob)
    const marketAccountStart = await fetchMarketAccount(client, BOB_ADDRESS, btcMarket.market_id)
    await checkResult(client, apyClient.deposit(usdcMarket, amount))

    let borrowStart = await fetchBorrowMarketContracts(client, BOB_ADDRESS, btcMarket.market_id)
    // borrow 
    await checkResult(client, apyClient.borrow(btcMarket, 1_000_000n, 0)) // 0.01 BTC market 1%

    // interest value is 1_000_000 *1/100  * 1/8760 = 1.1415 BTC ~2 BTC

    const marketAccount = await fetchMarketAccount(client, BOB_ADDRESS, btcMarket.market_id)
    expect(marketAccount.base_total - marketAccountStart.base_total).toBe(1_000_000n)

    // repayment
    await mintCoin(client, BTC, bob, 3n) // +  BTC
    await checkResult(client, apyClient.repay_from_coinstore(btcMarket, 2n))

    let borrow = await fetchBorrowMarketContracts(client, BOB_ADDRESS, btcMarket.market_id)
    expect(borrow.repaid_or_claimed).toBe(2n)
    expect(borrow.contracts.length - borrowStart.contracts.length).toBe(1)

    await checkResult(client, apyClient.repay_from_market_account(btcMarket, 1_000_000n))

    borrow = await fetchBorrowMarketContracts(client, BOB_ADDRESS, btcMarket.market_id)
    expect(borrow.repaid_or_claimed).toBe(0n)
    expect(borrow.contracts.length - borrowStart.contracts.length).toBe(0)

    console.log('claim rewards')

    apyClient.with(alice)

    let lend = await fetchLendMarketContracts(client, ALICE_ADDRESS, btcMarket.market_id)
    console.log(lend)

    await checkResult(client, apyClient.claim_loans(btcMarket))

    lend = await fetchLendMarketContracts(client, ALICE_ADDRESS, btcMarket.market_id)
    console.log(lend)

  }, longTestTimeout)
})

