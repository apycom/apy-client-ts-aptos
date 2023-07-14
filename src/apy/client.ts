
import type { AptosAccount, MaybeHexString, BCS, Types, HexString } from "aptos"
import { AptosClient } from "aptos"
import type { Market } from "../types"
import * as EF from "./entry_functions"
import { Apy } from "./protocol"
import { Amount } from "./market"

export type SignOption = {
  sender?: string
}

export interface Provider {
  account(): Promise<string>;
  signAndSubmit(payload: Types.EntryFunctionPayload, options?: SignOption): Promise<Types.PendingTransaction>;
  signTransaction(payload: Types.EntryFunctionPayload, option?: SignOption): Promise<Uint8Array>;
}

export class AccountProvider implements Provider {
  public constructor(public readonly client: AptosClient, public readonly signer: AptosAccount) { }

  /**
   * Sign a payload and return raw bcs encoded transaction
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async signTransaction(payload: Types.EntryFunctionPayload, option?: SignOption): Promise<Uint8Array> {
    const tx = await this.client.generateTransaction(
      this.signer.address(),
      payload
    );

    return this.client.signTransaction(
      this.signer,
      tx
    );
  }

  /**
   * Sign and send transaction. 
   * Returns pending transaction status
   */
  public async signAndSubmit(payload: Types.EntryFunctionPayload, options?: SignOption): Promise<Types.PendingTransaction> {
    const tx = await this.signTransaction(payload, options)
    return this.client.submitTransaction(tx)
  }

  public async account(): Promise<string> {
    return Promise.resolve(this.signer.address().hex())
  }

  public async submitTx(
    entry: Types.EntryFunctionPayload
  ): Promise<Types.Transaction> {
    const pendingTx = await this.signAndSubmit(entry);
    const result = await this.client.waitForTransactionWithResult(
      pendingTx.hash
    );
    return result;
  }

  /**
   * Replace signer and return new provider instance
   */
  public with(account: AptosAccount): AccountProvider {
    return new AccountProvider(this.client, account)
  }
}

class AmountValueError extends Error {
  public readonly amount: string

  constructor(amount: string) {
    super(`amount ${amount} has unrecognized format`);
    this.amount = amount;
  }
}

export class ApyClient {

  public constructor(
    public provider: Provider,
    public readonly apyAddress: MaybeHexString,
  ) { }

  public static ensureAmount(amount: Amount, decimals: number): BCS.Uint64 {
    if (typeof amount === "string") {
      let result = 0n
      let i = 0;
      while (i < amount.length) {
        const c = amount.charAt(i)
        i += 1

        if (c === "_") {
          // skip _ as it's a separator
          continue
        } else if (c === ".") {
          break
        }

        const v = parseInt(c)
        if (Number.isNaN(v)) {
          throw new AmountValueError(amount)
        }
        result = result * 10n + BigInt(v)
      }

      while (i < amount.length) {
        decimals -= 1
        const v = parseInt(amount.charAt(i))
        i += 1
        if (decimals < 0) {
          if (v !== 0) {
            throw new AmountValueError(amount)
          }
          continue
        }

        if (Number.isNaN(v)) {
          throw new AmountValueError(amount)
        }
        result = result * 10n + BigInt(v)
      }
      while (decimals > 0) {
        decimals -= 1
        result = result * 10n
      }
      return result
    }
    return amount
  }

  /**
   * Transfer coins from user's coinstore to the market account.
   *
   * @param market a market that market account is deposited to. 
   * @param amount Amount of coin to deposit 
   */
  public async deposit(market: Market, amount: Amount): Promise<Types.PendingTransaction> {
    return this.provider.signAndSubmit(EF.deposit(
      this.apyAddress, market.base.coin, market.market_id, ApyClient.ensureAmount(amount, market.base.decimals)
    ))
  }

  /**
   * Transfer coins from user's market account to the coinstore.
   *
   * @param market A market that market account is withdrawn. 
   * @param amount Amount of coin to withdraw.
   */
  public async withdraw(market: Market, amount: Amount): Promise<Types.PendingTransaction> {
    return this.provider.signAndSubmit(EF.withdraw(
      this.apyAddress, market.base.coin, market.market_id, ApyClient.ensureAmount(amount, market.base.decimals)
    ))
  }

  /**
   * Create lend offer at certain rate.
   *
   * @param market A market where a lend order will be placed. 
   * @param amount Amount of coin to allocate for lend.
   */
  public async lend(market: Market, amount: Amount, rate?: number): Promise<Types.PendingTransaction> {
    let price: BCS.Uint64 | undefined;
    if (rate) {
      price = Apy.percentToRate(rate, market)
    }

    return this.provider.signAndSubmit(EF.lend(
      this.apyAddress, market.market_id, ApyClient.ensureAmount(amount, market.base.decimals) / market.lot_size, price
    ))
  }

  /**
   * Cancel all lender orders removing them from a market orderbook.
   *
   * @param market A market whose orders are canceled. 
   */
  public async lend_cancel(market: Market): Promise<Types.PendingTransaction> {
    return this.provider.signAndSubmit(EF.lend_cancel(
      this.apyAddress, market.market_id
    ))
  }

  /**
   * Place borrow order. 
   *
   * @param market A market whose orderbook is used. 
   * @param amount Amount of coin to borrow. 
   * @param rate If specified, annual interest rate at with borrow order will be placed, overwise a market rate will be applied
   */
  public async borrow(market: Market, amount: Amount, rate?: number): Promise<Types.PendingTransaction> {
    let price: BCS.Uint64 | undefined;
    if (rate) {
      price = Apy.percentToRate(rate, market)
    }

    return this.provider.signAndSubmit(EF.borrow(
      this.apyAddress, market.market_id, ApyClient.ensureAmount(amount, market.base.decimals) / market.lot_size, price
    ))
  }

  /**
   * Cancel borrower orders removing all market orders from an orderbook.
   *
   * @param market A market whose orders are canceled. 
   */
  public async borrow_cancel(market: Market): Promise<Types.PendingTransaction> {
    return this.provider.signAndSubmit(EF.borrow_cancel(
      this.apyAddress, market.market_id
    ))
  }

  /**
   * Repay a loan from borrower's coinstore.
   *
   * @param market A market whose loans will be repayed. 
   * @param amount Amount of coins that will be transferred from signer's coinstore to the protocol. 
   */
  public async repay_from_coinstore(market: Market, amount: Amount): Promise<Types.PendingTransaction> {
    return this.provider.signAndSubmit(EF.repay_from_coinstore(
      this.apyAddress, market.market_id, market.base.coin, ApyClient.ensureAmount(amount, market.base.decimals)
    ))
  }

  /**
   * Repay a loan from borrower's market account
   *
   * @param market A market whose loans will be repayed. 
   * @param amount Amount of coins that will be transferred from signer's market account to the protocol. 
   */
  public async repay_from_market_account(market: Market, amount: Amount): Promise<Types.PendingTransaction> {
    return this.provider.signAndSubmit(EF.repay_from_market_account(
      this.apyAddress, market.market_id, ApyClient.ensureAmount(amount, market.base.decimals)
    ))
  }

  /**
   * Claim loans.
   * Claimed amount will be transferred to market account.
   *
   * @param market A market to claim from. 
   * @param account If specified, a lender account whose lend offers will be claimed, overwise the sender's account will be used. 
   */
  public async claim_loans(market: Market, account?: HexString): Promise<Types.PendingTransaction> {
    const user = account ?? await this.provider.account()
    return this.provider.signAndSubmit(EF.claim_loans(
      this.apyAddress, user, market.market_id, 20n
    ))
  }
}
