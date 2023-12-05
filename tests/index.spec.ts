import { describe, it, expect } from "vitest";
import { verify, SignatureResult } from "../src";

describe("verify", () => {
  it("should validate the signature", async () => {
    const [result, message] = await verify({
      messageByte:
        "05010000004254657a6f73205369676e6564204d6573736167653a206d79646170702e636f6d20323032312d30312d31345431353a31363a30345a2048656c6c6f20776f726c6421",
      contractAddress: "KT1XfFwTyoUVkZY7TT8erDaWK6UPkN87TKJn",
      signature:
        "edsigu5npnN9QaZCNgrTMKW2YhghDzJhcp9zE69QEjAbHW9kLvtcCh2QzHLzEJ52woWjWEMW5yvqGdLpaCqUdCDMxvY7H7vARxb",
      rpc: "https://ghostnet.tezos.marigold.dev",
    });

    expect(result).toBe(SignatureResult.VALID);
  });

  it("should fail because of rpc", async () => {
    const [result, _] = await verify({
      messageByte: "",
      contractAddress: "KT",
      signature: "",
      rpc: "httpnot a valid url",
    });

    expect(result).toBe(SignatureResult.RPC_ERROR);
  });

  it("should fail because signature is invalid", async () => {
    const [result, _] = await verify({
      messageByte:
        "050100000042547a6f73205369676e6564204d6573736167653a206d79646170702e636f6d20323032312d30312d31345431353a31363a30345a2048656c6c6f20776f726c6421",
      contractAddress: "KT1XfFwTyoUVkZY7TT8erDaWK6UPkN87TKJn",
      signature:
        "edsigu5npnN9QaZCNgrTMKW2YhghDzJhcp9zE69QEjAbHW9kLvtcCh2QzHLzEJ52woWjWEMW5yvqGdLpaCqUdCDMxvY7H7vARxb",
      rpc: "https://ghostnet.tezos.marigold.dev",
    });

    expect(result).toBe(SignatureResult.INVALID_SIGNATURE);
  });
});
