import { getApy } from "./helper"
import { longTestTimeout, getCoinType, USDC, ETH, BTC } from "./helper"
import { Apy } from "../apy"

describe("Get markets", () => {
  let apy: Apy;

  beforeAll(async () => {
    apy = await getApy()
    console.log(`apy ${apy}`)
  }, longTestTimeout)

  test("USDC ETH BTC markets", () => {
    expect(
      apy.getMarketByCoinPeriod(getCoinType(USDC), "Hour")
    ).not.toBe(undefined)

    expect(
      apy.getMarketByCoinPeriod(getCoinType(BTC), "Hour")
    ).not.toBe(undefined)

    expect(
      apy.getMarketByCoinPeriod(getCoinType(ETH), "Hour")
    ).not.toBe(undefined)

    expect(
      apy.getMarketByCoinPeriod(getCoinType(ETH), "Day")
    ).toBe(undefined)
  })

  test("convert rate into market price", () => {
    expect(
      Apy.percentToRate(5, { lot_size: 100000n, tick_size: 1000n })
    ).toBe(5n);

    expect(
      Apy.percentToRate(50.0, { lot_size: 100000n, tick_size: 1000n })
    ).toBe(50n);

    expect(
      Apy.percentToRate(5, { lot_size: 100000n, tick_size: 100n })
    ).toBe(50n);
  })

})
