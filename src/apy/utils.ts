import {Side, Period, TypeInfo} from "../types"
import type { Types } from "aptos"
import { HexString } from "aptos"

export const sideToNumber = (side: Side): number => {
  switch (side) {
    case "Borrow":
      return 0;
    case "Lend":
      return 1;
    default:
      throw new Error(`Unknown side: ${side}`);
  }
};

export const sideToBoolean = (side: Side): boolean => {
  switch (side) {
    case "Borrow":
      return false;
    case "Lend":
      return true;
    default:
      throw new Error(`Unknown side: ${side}`);
  }
};

export const periodToDivisor = (period: Period): number => {
  switch (period) {
    case "Hour":
      return 8760;
    case "Day":
      return 365;
    case "Week":
      return 52
    case "Month":
      return 12;
    case "Year":
      return 1;
  }
}

const vecToString = (vec: string): string => {
  return new TextDecoder("utf-8").decode(new HexString(vec).toUint8Array());
}

export const typeinfoToType = (typeinfo: TypeInfo): Types.MoveType => {
  return `${typeinfo.account_address}::${vecToString(typeinfo.module_name)}::${vecToString(typeinfo.struct_name)}`
}
