/* eslint-disable @typescript-eslint/no-unused-vars*/
interface BigInt {
  toJSON(): string;
}

BigInt.prototype.toJSON = function() {
  return `${this.toString()}n`;
};

