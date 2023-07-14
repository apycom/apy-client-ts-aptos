import type { Types, HexString } from "aptos";

export type Side = "Borrow" | "Lend";

export type LTVLevel = "Initial" | "Reset" | "Maintanance" | "Critical";

export type Period = "Hour" | "Day" | "Week" | "Month" | "Year"

export type ApiCoin = {
  coin: Types.MoveType,
  decimals: number;
};

export type LtvParams = {
  initial: number,
  reset: number,
  maintanance: number,
  critical: number,
}

export type Market = {
  name: string,
  market_id: bigint;
  base: ApiCoin;
  ltv: LtvParams;
  lot_size: bigint;
  tick_size: bigint;
  min_size: bigint;
  period_divisor: number;
  lend_borrow: boolean;
  price_id: HexString;
}

export type MarketAccount = {
  base_total: bigint,
  quote_total: bigint,
  base_available: bigint,
  quote_available: bigint,
}

export type Contract = {
  maturity: Date,
  principal: bigint,
  interest: bigint
}

export type Contracts = {
  contracts: Array<Contract>,
  total_principal: bigint,
  totall_interest: bigint,
  repaid_or_claimed: bigint,
}
