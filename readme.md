# TzSafe Signature

This library allows you to verify signatures that represent a single owner on TzSafe.
You probably know that to sign a message and verify a signature, you need to use a private key and public, but in the case of abstracted account (contract acting as a wallet), there are no the keys.
There are 2 way of doing it:

1. To be able to sign messages and receive an immediate response, we forward it to a wallet owned by an owner currently connected to TzSafe App. From a Dapp point of view, it means that you'll receive a sign message but you can't verify as you don't know which owners’ address signed it. With this library, we take care of the verification for you! Note that the owner of TzSafe can change. Therefore, please always verify the obtained signature.
2. The other signing method is the proof-of-event challenge, following TZIP-27. The signature produced by this method serves as an agreement among owners and is less affected by owner changes. However, the response time for receiving signatures might be longer for DApps. Please refer to TZIP-27 for more details.

This library helps you handle the first case.

**:warning: This library only supports mainnet and ghostnet**

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
