import { Apy, ApyClient, AccountProvider } from "../apy"
import { AptosClient, AptosAccount, HexString, FailedTransactionError, BCS, FaucetClient } from "aptos"
import type { Types } from "aptos"
import * as dotenv from 'dotenv';

// Makes an account from private key and address
const to_account = (privateKeyHex?: string, address?: string): AptosAccount => {
  if (privateKeyHex === undefined) {
    throw new Error("private key is not set")
  }
  return AptosAccount.fromAptosAccountObject({
    address,
    privateKeyHex
  })
}

const result = dotenv.config({ path: './.play.env' });
if (result.error) {
  throw result.error
}
const USDC = to_account(process.env.USDC, process.env.USDC_ADDRESS)
const BTC = to_account(process.env.BTC, process.env.BTC_ADDRESS)
// const ETH = to_account(process.env.ETH, process.env.ETH_ADDRESS)

// aptos coin type
// const APT = '0x01::aptos_coin::AptosCoin'

const APY_ADDRESS = new HexString(isSet(process.env.APY_ADDRESS))
const NODE_URL = process.env.APTOS_NODE_URL ?? 'https://fullnode.testnet.aptoslabs.com'
const FAUCET_URL = process.env.APTOS_FAUCET_URL ?? 'https://faucet.testnet.aptoslabs.com'

// Create apy client powered by simple account provider. In real world applications use Pontem wallet.  
function getApyClient(signer: AptosAccount, client: AptosClient, apy: HexString): ApyClient {
  return new ApyClient(new AccountProvider(client, signer), apy);
}

// Returns coin type
function getCoinType(account: AptosAccount): string {
  return `${account.address().hex()}::coin::TestCoin`
}

function isSet<T>(val?: T): T {
  if (val === undefined) {
    throw new Error("value is unknown")
  }
  return val
}

async function mintCoin(client: AptosClient, account: AptosAccount, to: AptosAccount, amount: BCS.Uint64): Promise<void> {
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

  if (!(tx as Types.UserTransaction).success) {
    throw new FailedTransactionError(
      `Transaction ${tx.hash} committed to the blockchain but execution failed`,
      tx,
    );
  }
}

const MARKET_RATE = 0

async function main() {
  // It supposed, BTC, USDC and ETH markets are configured.
  const client = new AptosClient(NODE_URL);
  // Borrower borrows BTC using USDC as a collateral
  const borrower = new AptosAccount();
  // Lender lends BTC
  const lender = new AptosAccount();

  console.log(`borrower: ${borrower.address()}`)
  console.log(`lender: ${lender.address()}`)

  const borrowerClient = getApyClient(borrower, client, APY_ADDRESS)
  const lenderClient = getApyClient(lender, client, APY_ADDRESS)

  const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL, {});
  await faucetClient.fundAccount(borrower.address(), 100_000_000_000);
  await faucetClient.fundAccount(lender.address(), 100_000_000_000);
  // Mint coins
  console.log("mint USDC for borrower")
  await mintCoin(client, USDC, borrower, ApyClient.ensureAmount('100_000', 8))
  console.log("mint BTC for lender")
  await mintCoin(client, BTC, lender, ApyClient.ensureAmount('10.0', 8))


  // Fetch markets into application cache
  const apy = new Apy(APY_ADDRESS)
  await apy.updateMarkets(client)
  // const aptMarket = isSet(apy.getMarketByCoinPeriod(APT, "Hour"))
  const usdcMarket = isSet(apy.getMarketByCoinPeriod(getCoinType(USDC), "Hour"))
  // const ethMarket = isSet(apy.getMarketByCoinPeriod(getCoinType(ETH), "Hour"))
  const btcMarket = isSet(apy.getMarketByCoinPeriod(getCoinType(BTC), "Hour"))

  // Deposit USDC as a collateral
  console.log("deposit 100_000 USDC")
  await borrowerClient.deposit(usdcMarket, '100_000')
  // Deposit BTC and place a lend order

  console.log("deposit 10 BTC")
  await lenderClient.deposit(btcMarket, '10.0')
  console.log("lend 10 BTC at 1%")
  await lenderClient.lend(btcMarket, '10.0', 1.0) // 1%
  // Cancel previous order and place new one at 2% 
  console.log("cancel a lend")
  await lenderClient.lend_cancel(btcMarket)
  console.log("lend 10 BTC at 2%")
  await lenderClient.lend(btcMarket, '10.0', 2.0) // 2%
  // Create borrow request on the 0.01 BTC

  console.log("borrow 0.01 BTC at market (2%) rate")
  await borrowerClient.borrow(btcMarket, '0.01', MARKET_RATE) // 0.01 BTC at market rate(2%) 
  // Withdraw borrowed BTC
  console.log("withdraw borrowed 0.01 BTC")
  await borrowerClient.withdraw(btcMarket, '0.01')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
