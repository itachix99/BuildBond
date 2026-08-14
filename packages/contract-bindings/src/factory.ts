import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
import { MilestoneInput, ProjectTerms } from "./index.js";

export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}

export const FactoryError = {
  1: {message:"NotInitialized"},
  2: {message:"AlreadyInitialized"},
  3: {message:"Unauthorized"},
  4: {message:"InvalidWasmHash"},
  5: {message:"ProjectAlreadyExists"},
  6: {message:"ProjectNotFound"},
  7: {message:"InvalidAmount"},
  8: {message:"ArithmeticOverflow"}
}

export interface ProjectMetadata {
  arbiter: string;
  contractor: string;
  created_at: u64;
  escrow_address: string;
  inspector: string;
  owner: string;
  payment_token: string;
  project_id: u32;
  terms_hash: Buffer;
  title_hash: Buffer;
  total_committed: i128;
}

export type FactoryDataKey = {tag: "Initialized", values: void} | {tag: "Admin", values: void} | {tag: "WasmHash", values: void} | {tag: "ProjectCount", values: void} | {tag: "Project", values: readonly [u32]} | {tag: "ProjectByAddress", values: readonly [string]} | {tag: "ProjectsByParticipant", values: readonly [string]};

export interface FactoryClient {
  admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>;
  version: (options?: MethodOptions) => Promise<AssembledTransaction<string>>;
  wasm_hash: (options?: MethodOptions) => Promise<AssembledTransaction<Result<Buffer>>>;
  initialize: ({admin, escrow_wasm_hash}: {admin: string, escrow_wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
  project_by_id: ({id}: {id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Option<ProjectMetadata>>>;
  project_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
  deploy_project: ({owner, salt, title_hash, terms, milestones}: {owner: string, salt: Buffer, title_hash: Buffer, terms: ProjectTerms, milestones: Array<MilestoneInput>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>;
  update_wasm_hash: ({admin, new_wasm_hash}: {admin: string, new_wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
  project_by_address: ({escrow_address}: {escrow_address: string}, options?: MethodOptions) => Promise<AssembledTransaction<Option<ProjectMetadata>>>;
  projects_by_participant: ({participant}: {participant: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>;
}

export class FactoryContractClient extends ContractClient {
  static async deploy<T = FactoryContractClient>(
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        wasmHash: Buffer | string;
        salt?: Buffer | Uint8Array;
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options);
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAA+kAAAATAAAH0AAAAAxGYWN0b3J5RXJyb3I=",
        "AAAAAAAAACtSZXR1cm5zIHRoZSBmYWN0b3J5IGNvbnRyYWN0IHZlcnNpb24gc3ltYm9sAAAAAAd2ZXJzaW9uAAAAAAAAAAABAAAAEQ==",
        "AAAAAAAAAAAAAAAJd2FzbV9oYXNoAAAAAAAAAAAAAAEAAAPpAAAD7gAAACAAAAfQAAAADEZhY3RvcnlFcnJvcg==",
        "AAAAAAAAAFFJbml0aWFsaXplcyB0aGUgZmFjdG9yeSBjb250cmFjdCB3aXRoIGFkbWluIGFkZHJlc3MgYW5kIGVzY3JvdyBXQVNNIGJ5dGVjb2RlIGhhc2gAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAABBlc2Nyb3dfd2FzbV9oYXNoAAAD7gAAACAAAAABAAAD6QAAAAIAAAfQAAAADEZhY3RvcnlFcnJvcg==",
        "AAAAAAAAAAAAAAANcHJvamVjdF9ieV9pZAAAAAAAAAEAAAAAAAAAAmlkAAAAAAAEAAAAAQAAA+gAAAfQAAAAD1Byb2plY3RNZXRhZGF0YQA=",
        "AAAAAAAAAAAAAAANcHJvamVjdF9jb3VudAAAAAAAAAAAAAABAAAABA==",
        "AAAAAAAAAGVEZXBsb3lzIGFuIGlzb2xhdGVkLCBkZWRpY2F0ZWQgZXNjcm93IGNvbnRyYWN0IGluc3RhbmNlIGZvciBhIGNvbnN0cnVjdGlvbiBwcm9qZWN0IGFuZCBpbml0aWFsaXplcyBpdAAAAAAAAA5kZXBsb3lfcHJvamVjdAAAAAAABQAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAARzYWx0AAAD7gAAACAAAAAAAAAACnRpdGxlX2hhc2gAAAAAA+4AAAAgAAAAAAAAAAV0ZXJtcwAAAAAAB9AAAAAMUHJvamVjdFRlcm1zAAAAAAAAAAptaWxlc3RvbmVzAAAAAAPqAAAH0AAAAA5NaWxlc3RvbmVJbnB1dAAAAAAAAQAAA+kAAAATAAAH0AAAAAxGYWN0b3J5RXJyb3I=",
        "AAAAAAAAAGBBbGxvd3MgdGhlIGZhY3RvcnkgYWRtaW4gdG8gdXBkYXRlIHRoZSB0ZW1wbGF0ZSBlc2Nyb3cgV0FTTSBieXRlY29kZSBoYXNoIGZvciBmdXR1cmUgZGVwbG95bWVudHMAAAAQdXBkYXRlX3dhc21faGFzaAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAQAAA+kAAAACAAAH0AAAAAxGYWN0b3J5RXJyb3I=",
        "AAAAAAAAAAAAAAAScHJvamVjdF9ieV9hZGRyZXNzAAAAAAABAAAAAAAAAA5lc2Nyb3dfYWRkcmVzcwAAAAAAEwAAAAEAAAPoAAAH0AAAAA9Qcm9qZWN0TWV0YWRhdGEA",
        "AAAAAAAAAAAAAAAXcHJvamVjdHNfYnlfcGFydGljaXBhbnQAAAAAAQAAAAAAAAALcGFydGljaXBhbnQAAAAAEwAAAAEAAAPqAAAAEw==",
        "AAAABAAAAAAAAAAAAAAADEZhY3RvcnlFcnJvcgAAAAgAAAAAAAAADk5vdEluaXRpYWxpemVkAAAAAAABAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAAIAAAAAAAAADFVuYXV0aG9yaXplZAAAAAMAAAAAAAAAD0ludmFsaWRXYXNtSGFzaAAAAAAEAAAAAAAAABRQcm9qZWN0QWxyZWFkeUV4aXN0cwAAAAUAAAAAAAAAD1Byb2plY3ROb3RGb3VuZAAAAAAGAAAAAAAAAA1JbnZhbGlkQW1vdW50AAAAAAAABwAAAAAAAAASQXJpdGhtZXRpY092ZXJmbG93AAAAAAAI",
        "AAAAAQAAAAAAAAAAAAAAD1Byb2plY3RNZXRhZGF0YQAAAAALAAAAAAAAAAdhcmJpdGVyAAAAABMAAAAAAAAACmNvbnRyYWN0b3IAAAAAABMAAAAAAAAACmNyZWF0ZWRfYXQAAAAAAAYAAAAAAAAADmVzY3Jvd19hZGRyZXNzAAAAAAATAAAAAAAAAAlpbnNwZWN0b3IAAAAAAAATAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAADXBheW1lbnRfdG9rZW4AAAAAAAATAAAAAAAAAApwcm9qZWN0X2lkAAAAAAAEAAAAAAAAAAp0ZXJtc19oYXNoAAAAAAPuAAAAIAAAAAAAAAAKdGl0bGVfaGFzaAAAAAAD7gAAACAAAAAAAAAAD3RvdGFsX2NvbW1pdHRlZAAAAAAL",
        "AAAABQAAAAAAAAAAAAAAFFByb2plY3REZXBsb3llZEV2ZW50AAAAAQAAABZwcm9qZWN0X2RlcGxveWVkX2V2ZW50AAAAAAAGAAAAAAAAAApwcm9qZWN0X2lkAAAAAAAEAAAAAAAAAAAAAAAOZXNjcm93X2FkZHJlc3MAAAAAABMAAAAAAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAAAAAAAApjb250cmFjdG9yAAAAAAATAAAAAAAAAAAAAAAPdG90YWxfY29tbWl0dGVkAAAAAAsAAAAAAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAGAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAFFdhc21IYXNoVXBkYXRlZEV2ZW50AAAAAQAAABd3YXNtX2hhc2hfdXBkYXRlZF9ldmVudAAAAAAEAAAAAAAAAA1vbGRfd2FzbV9oYXNoAAAAAAAD7gAAACAAAAAAAAAAAAAAAA1uZXdfd2FzbV9oYXNoAAAAAAAD7gAAACAAAAAAAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAGAAAAAAAAAAI=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABwAAAAAAAAAAAAAAC0luaXRpYWxpemVkAAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAIV2FzbUhhc2gAAAAAAAAAAAAAAAxQcm9qZWN0Q291bnQAAAABAAAAAAAAAAdQcm9qZWN0AAAAAAEAAAAEAAAAAQAAAAAAAAAQUHJvamVjdEJ5QWRkcmVzcwAAAAEAAAATAAAAAQAAAAAAAAAVUHJvamVjdHNCeVBhcnRpY2lwYW50AAAAAAAAAQAAABM="
      ]),
      options
    );
  }
  public readonly fromJSON = {
    admin: this.txFromJSON<Result<string>>,
    version: this.txFromJSON<string>,
    wasm_hash: this.txFromJSON<Result<Buffer>>,
    initialize: this.txFromJSON<Result<void>>,
    project_by_id: this.txFromJSON<Option<ProjectMetadata>>,
    project_count: this.txFromJSON<u32>,
    deploy_project: this.txFromJSON<Result<string>>,
    update_wasm_hash: this.txFromJSON<Result<void>>,
    project_by_address: this.txFromJSON<Option<ProjectMetadata>>,
    projects_by_participant: this.txFromJSON<Array<string>>,
  };
}
