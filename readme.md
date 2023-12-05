# TzSafe Signature

This library allows you to verify signatures that are coming from TzSafe. You probably know that to sign a message, you need to use a public key, but in the case of abstracted account (contract acting as a wallet), there's no public key. To be able to sign messages, we forward it to a wallet which is currently connected to TzSafe. From a Dapp point of view, it means that you'll receive a sign message but you can't verify as you don't know which address signed it. With this library, we take care of the verification for you!

## How to install it ?

```bash
npm i @marigold-dev/tzsafe-signature
```

## How to use it ?

### Validate a signature

```ts
import { verify, SignatureResult } from "@marigold-dev/tzsafe-signature";

async function itWorks() {
  const [result, _reason] = await verify({
    messageByte:
      "05010000004254657a6f73205369676e6564204d6573736167653a206d79646170702e636f6d20323032312d30312d31345431353a31363a30345a2048656c6c6f20776f726c6421",
    contractAddress: "KT1XfFwTyoUVkZY7TT8erDaWK6UPkN87TKJn",
    signature:
      "edsigu5npnN9QaZCNgrTMKW2YhghDzJhcp9zE69QEjAbHW9kLvtcCh2QzHLzEJ52woWjWEMW5yvqGdLpaCqUdCDMxvY7H7vARxb",
    rpc: "https://ghostnet.tezos.marigold.dev",
  });

  if (result === SignatureResult.VALID) {
    console.log("Valid");
  } else {
    console.log("Not valid");
  }
}

itWorks();
```

### Error occurred

```ts
import { verify, SignatureResult } from "@marigold-dev/tzsafe-signature";

async function itFails() {
  const [result, reason] = await verify({
    messageByte: "",
    contractAddress: "KT1XfFwTyoUVkZY7TT8erDaWK6UPkN87TKJn",
    signature: "",
    rpc: "http not an url",
  });

  if (result === SignatureResult.RPC_ERROR) {
    console.log("Error:", reason);
  }
}

itFails();
```
