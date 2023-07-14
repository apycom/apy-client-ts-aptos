import { ApyClient } from "../apy"

describe("Utility functions", () => {

  test("parse integer amount", () => {
    expect(ApyClient.ensureAmount('100', 0)).toBe(100n)
  })

  test("parse long integer amount", () => {
    expect(ApyClient.ensureAmount('18446744073709551616', 0)).toBe(18446744073709551616n)
  })

  test("parse integer amount with separator", () => {
    expect(ApyClient.ensureAmount('300_000', 0)).toBe(300_000n)
  })

  test("parse float amount with separator", () => {
    expect(ApyClient.ensureAmount('3_000.40', 2)).toBe(300040n)
    expect(ApyClient.ensureAmount('100_000.00', 0)).toBe(100_000n)
    expect(ApyClient.ensureAmount('0.001', 3)).toBe(1n)
    expect(ApyClient.ensureAmount('0.001', 6)).toBe(1000n)
  })

  test("parse incorrect amounts", () => {
    expect(() => ApyClient.ensureAmount('3,000', 0)).toThrow()
    expect(() => ApyClient.ensureAmount('3000.20', 0)).toThrow()
    expect(() => ApyClient.ensureAmount('40e2', 0)).toThrow()
  })
})
