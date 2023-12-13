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

/**
 * @enum {string} All the possible outcomes when you verify a signature
 */
export const SignatureResult = {
  /**
   * Something went wrong when fetching tzkt api
   */
  TZKT_ERROR: "TZKT_ERROR",
  /**
   * Something went wrong when calling the rpc: network, data deserialization, etc...
   */
  RPC_ERROR: "RPC_ERROR",
  /**
   * `contractAddress` wasn't a TzSafe wallet
   */
  NOT_TZSAFE_WALLET: "NOT_TZSAFE_WALLET",

  /**
   * The provided signature wasn't valid. It either means:
   * - The message is not matching the signature
   * - The person who signed the message wasn't a signer of the provided TzSafe wallet
   */
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  /**
   * The signature could be verified
   */
  VALID: "VALID",
  /**
   * Failed to decode the storage when retrieving the contract. It probably means that the contract wasn't a TzSafe contract.
   * This case shouldn't happen, so please open an issue if it happens
   */
  MALFORMED_STORAGE: "MALFORMED_STORAGE",
} as const;

export type SignatureResult =
  (typeof SignatureResult)[keyof typeof SignatureResult];

/** The input for the `verify` function */
export type verifyData = {
  messageByte: string;
  contractAddress: `KT${string}`;
  signature: string;
  rpc?: `http${string}`;
};

/**
 * Verify if a signature provided by TzSafe is valid
 * @param verifyData All the data required to verify the signature
 * @param {string} verifyData.messageByte A string containing the message that has been converted to bytes
 * @param {string} verifyData.contractAddress Address of the TzSafe contract
 * @param {string} verifyData.signature Signature returned by the user
 * @param {string} [verifyData.rpc="https://tezos.marigold.dev"] The RPC that we'll be used to verify the wallet and retrived the signers
 */
export async function verify({
  messageByte,
  contractAddress,
  signature,
  rpc = DEFAULT_RPC,
}: verifyData): Promise<
  | [code: Extract<SignatureResult, "RPC_ERROR">, message: string]
  | [code: Extract<SignatureResult, "TZKT_ERROR">, message: string]
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
    const chainId = await client.getChainId();

    let tzktUrl: string;

    if (chainId === MAINNET_ID) {
      tzktUrl = TZKT;
    } else {
      tzktUrl = GHOSTNET_TZKT;
    }

    let version: version | "unknown version";

    try {
      version = await fetch(`${tzktUrl}/contracts?address=${contractAddress}`)
        .then((r) => r.json())
        .then(
          ([{ typeHash, codeHash }]: {
            typeHash: number;
            codeHash: number;
          }[]) => {
            return HASHES[`${typeHash}:${codeHash}`] ?? "unknown version";
          },
        );
    } catch (e) {
      return [SignatureResult.TZKT_ERROR, (e as Error).message];
    }

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
