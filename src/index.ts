import { verifySignature } from "@taquito/utils";
import { MichelsonV1ExpressionBase, RpcClient } from "@taquito/rpc";

const DEFAULT_RPC = "https://tezos.marigold.dev";
const MAINNET_ID = "NetXdQprcVkpaWU";

const GHOSTNET_TZKT = "https://api.ghostnet.tzkt.io/v1";
const TZKT = "https://api.tzkt.io/v1";

let client: RpcClient;

const HASHES = {
  "1047066606:471411811": "0.0.6",
  "2045366626:-1526481454": "0.0.8",
  "1273323151:735333822": "0.0.9",
  "-357299388:2102290129": "0.0.10",
  "-483287042:521053333": "0.0.11",
  "-483287042:793087855": "0.0.11b",
  "-483287042:-426350137": "0.1.1",
  "-933474574:1358594366": "0.3.0",
  "1576695458:46756700": "0.3.1",
  "66001562:-1892417854": "0.3.2",
  "-623288749:1866000220": "0.3.3",
} as const;

type version = (typeof HASHES)[keyof typeof HASHES];

export const SignatureResult = {
  RPC_ERROR: "RPC_ERROR",
  NOT_TZSAFE_WALLET: "NOT_TZSAFE_WALLET",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  VALID: "VALID",
  MALFORMED_STORAGE: "MALFORMED_STORAGE",
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
  contractAddress: `KT${string}`;
  signature: string;
  rpc?: `http${string}`;
}): Promise<
  | [code: Extract<SignatureResult, "RPC_ERROR">, message: string]
  | [code: Extract<SignatureResult, "NOT_TZSAFE_WALLET">, message: undefined]
  | [code: Extract<SignatureResult, "INVALID_SIGNATURE">, message: undefined]
  | [code: Extract<SignatureResult, "MALFORMED_STORAGE">, message: string]
  | [code: Extract<SignatureResult, "VALID">, message: undefined]
> {
  if (!client) {
    client = new RpcClient(rpc);
  } else if (client.getRpcUrl() !== rpc) {
    client = new RpcClient(rpc);
  }

  try {
    // const chainId = await fetch(
    //   `${client.getRpcUrl()}/chains/main/chain_id`,
    // ).then((res) => res.json());
    const chainId = await client.getChainId();

    let tzktUrl: string;

    if (chainId === MAINNET_ID) {
      tzktUrl = TZKT;
    } else {
      tzktUrl = GHOSTNET_TZKT;
    }

    const version: version | "unknown version" = await fetch(
      `${tzktUrl}/contracts?address=${contractAddress}`,
    )
      .then((r) => r.json())
      .then(
        ([{ typeHash, codeHash }]: {
          typeHash: number;
          codeHash: number;
        }[]) => {
          return HASHES[`${typeHash}:${codeHash}`] ?? "unknown version";
        },
      );

    if (version === "unknown version") {
      return [SignatureResult.NOT_TZSAFE_WALLET, undefined];
    }

    const storage = await client.getStorage(contractAddress);

    if (!("args" in storage) || !storage.args)
      return [SignatureResult.MALFORMED_STORAGE, "The storage is malformed"];

    const signers = storage.args.find((v) => Array.isArray(v));

    if (!signers)
      return [
        SignatureResult.MALFORMED_STORAGE,
        "Couldn't find signers in the storage",
      ];

    if (!Array.isArray(signers))
      return [SignatureResult.MALFORMED_STORAGE, "Signers are not an array"];

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
