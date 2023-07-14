/* eslint-disable @typescript-eslint/no-explicit-any*/
import type { Market, Period, TypeInfo } from "../types"
import { HexString } from "aptos"
import type { BCS, Types } from "aptos"
import { periodToDivisor, typeinfoToType } from "./utils"

import { AptosClient } from "aptos";
const EXP6 = BigInt(1000000)

export class Apy {
  public readonly markets: Array<Market>
  public readonly apy: HexString

  constructor(apy: HexString) {
    this.markets = []
    this.apy = apy
  }

  toString(): string {
    return this.apy.hex()
  }


  /** 
   * Find market by coin type and lend term.
   */
  getMarketByCoinPeriod(
    coin: Types.MoveType,
    term: Period,
  ): Market | undefined {
    const period_divisor = periodToDivisor(term)

    return this.markets.find(m => m.base.coin == coin && m.period_divisor == period_divisor)
  }

  /**
   * Find market by market Id
   */
  getMarketById(
    market_id: BCS.Uint64
  ): Market | undefined {

    return this.markets.find(m => m.market_id = market_id)
  }

  /**
   * Fetch all markets from the protocol
   */
  async updateMarkets(
    client: AptosClient
  ) {
    const registry = `${this.apy}::registry::Registry`
    let state = await client.getAccountResource(this.apy, registry)

    const registry_handle = (state.data as any).market_id_to_info.table.inner.handle

    const protocol = `${this.apy}::protocol::ProtocolState`
    state = await client.getAccountResource(this.apy, protocol)

    const markets = (state.data as any).markets.table
    const protocol_handle = markets.inner.handle

    while (this.markets.length > 0) {
      this.markets.pop()
    }

    for (let i = 1; i <= markets.length; i++) {
      const m = await Apy.fetchMarketById(client, this.apy, protocol_handle, registry_handle, i)
      this.markets.push(m)
    }
  }

  /**
   * Fetch a market from the protocol.
   */
  static async fetchMarketById(
    client: AptosClient,
    apy: HexString,
    protocol_handle: string,
    registry_handle: string,
    market_id: number
  ): Promise<Market> {

    // protocol::Market
    const m = (await client.getTableItem(protocol_handle, {
      key_type: 'u64',
      value_type: `${apy}::tablist::Node<u64,${apy}::protocol::Market>`,
      key: `${market_id}`
    })).value as any

    const coinType = typeinfoToType(m.base_type as TypeInfo)

    // registry::MarketInfo
    const n = (await client.getTableItem(registry_handle, {
      key_type: 'u64',
      value_type: `${apy}::tablist::Node<u64,${apy}::registry::MarketInfo>`,
      key: `${market_id}`
    })).value as any

    return {
      name: n.base_name_generic,
      market_id: BigInt(market_id),
      base: {
        coin: coinType,
        decimals: m.decimals
      },
      ltv: m.ltv_params,
      lot_size: BigInt(n.lot_size),
      tick_size: BigInt(n.tick_size),
      min_size: BigInt(n.min_size),
      period_divisor: m.period_divisor,
      lend_borrow: m.lend_borrow,
      price_id: new HexString(m.price_id.bytes)
    }
  }
  /**
   * Convert rate  given as a percentage  into market price  
   */
  public static percentToRate(rate: number, market: Pick<Market, "lot_size" | "tick_size">): BCS.Uint64 {
    return market.lot_size * BigInt(Math.ceil(rate * 10000)) / market.tick_size / EXP6
  }

}

