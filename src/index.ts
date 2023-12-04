import { verifySignature } from "@taquito/utils";
import { MichelsonV1ExpressionBase, RpcClient } from "@taquito/rpc";

const DEFAULT_RPC = "https://ghostnet.tezos.marigold.dev";
let client: RpcClient;

export const SignatureResult = {
  RPC_ERROR: "RPC_ERROR",
  NOT_TZSAFE_WALLET: "NOT_TZSAFE_WALLET",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  VALID: "VALID",
} as const;

export type SignatureResult =
  (typeof SignatureResult)[keyof typeof SignatureResult];

export async function verify({
  messageByte,
  contractAddress,
  signature,
  rpc = DEFAULT_RPC,
}: {
  messageByte: string;
  contractAddress: string;
  signature: string;
  rpc?: string;
}) {
  if (!client) {
    client = new RpcClient(rpc);
  } else if (client.getRpcUrl() !== rpc) {
    client = new RpcClient(rpc);
  }

  try {
    const storage = await client.getStorage(contractAddress);

    if (!("args" in storage) || !storage.args)
      return [SignatureResult.RPC_ERROR, "The storage is malformed"];

    const signers = storage.args.find((v) => Array.isArray(v));

    if (!signers)
      return [
        SignatureResult.RPC_ERROR,
        "Couldn't find signers in the storage",
      ];

    if (!Array.isArray(signers))
      return [SignatureResult.RPC_ERROR, "Signers are not an array"];

    const publicKeys = await Promise.all(
      signers.map((v) =>
        client.getManagerKey((v as MichelsonV1ExpressionBase).string),
      ),
    );

    for (const pk of publicKeys) {
      if (
        verifySignature(
          messageByte,
          typeof pk === "string" ? pk : pk.key,
          signature,
        )
      ) {
        return [SignatureResult.VALID, undefined];
      }
    }

    return [SignatureResult.INVALID_SIGNATURE, undefined];
  } catch (e) {
    return [SignatureResult.RPC_ERROR, (e as Error).message];
  }
}
