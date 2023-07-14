# Apy on Aptos Typescript web client
The Apy on Aptos TypeScript provides a convenient way to interact with the Apy protocol on Aptos blockchain 
using TypeScript. It offers a set of utility functions, classes, and types to simplify 
the integration process and enhance developer productivity.

## Installation

For use in Node.js or a web application
```
pnpm install 
```

## Example

To run the example it needs the Apy-on-Aptos to be published and lend-borrow markets to be configured.  
For details refer to [Apy-on-Aptos testnet deployment instruction](../deploy/README.md)


```
import {Apy, ApyClient, AccountProvider } from "@apy/client"
import { AptosClient, AptosAccount } from "aptos"

// coin types
const USDC = process.env.USDC
const BTC = process.env.BTC
const ETH = process.env.ETH

const APY= process.env.APY ?? '0xcae5c3fd74f07e86cd8013714999703fa12eef8d47d8de56aeda47fa69c2d8f9'

// create apy client powered by simple account provider. In real world applications use Pontem wallet.  
export function getApyClient(signer: AptosAccount, client: AptosClient, apy: HexString): ApyTestClient {
  return new ApyClient(new AccountProvider(client, signer), apy);
}

export function isSet<T>(val?: T): T {
  if (val === undefined) {
    throw new Error("value is unknown")
  }
  return val
}

// It supposed, we have configured BTC, USDC and ETH markets.
const apy = new Apy(APY)
await apy.updateMarkets(new AptosClient(NODE_URL))

const borrower = new AptosAccount();
const lender = new AptosAccount();
// ... endow borrower with USDC and lender with BTC

const client = new AptosClient(NODE_URL);

let borrowerClient = getApyClient(borrower, client, APY)
let lenderClient = getApyClient(lender, client, APY)

// fetch markets into application cache
const apy = new Apy(APY)
await apy.updateMarkets(client)

const usdcMarket = isSet(apy.getMarketByCoinPeriod(USDC, "Hour"))
const ethMarket = isSet(apy.getMarketByCoinPeriod(ETH, "Hour"))
const btcMarket = isSet(apy.getMarketByCoinPeriod(BTC, "Hour"))

// deposit USDC as a collateral

await borrowerClient.deposit(usdcMarket, '100_000')

// deposit BTC and place a lend order
await lenderClient.deposit(btcMarket, '1.0')
await lenderClient.lend(btcMarket, '1.0', 1) // 1%

// cancel previous order and place new one at 2% 
await lenderClient.lend_cancel(btcMarket)
await lenderClient.lend(btcMarket, '1.0', 2.0) // 2%

// create borrow request on the 0.01 BTC
await borrowerClient.borrow(btcMarket, '0.01', 0) // 0.01 BTC at market rate(2%) 

// withdraw borrowed BTC
await borrowerClient.withdraw(btcMarket, '0.01')
```

