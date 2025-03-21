/* tslint:disable */
/* eslint-disable */
export function main(): void;
export enum SignerType {
  PrivateKey = 0,
  NIP07 = 1,
}
export class Nip04Methods {
  private constructor();
  free(): void;
  encrypt(public_key: string, content: string): Promise<string>;
  decrypt(public_key: string, encrypted_content: string): Promise<string>;
}
export class Nip44Methods {
  private constructor();
  free(): void;
  encrypt(public_key: string, content: string): Promise<string>;
  decrypt(public_key: string, encrypted_content: string): Promise<string>;
}
export class NostrClientWrapper {
  free(): void;
  constructor();
  initialize(signer_type: SignerType, private_key?: string | null): Promise<void>;
  getPrivateKey(): string | undefined;
  getPublicKey(): Promise<string>;
  getRelays(): Promise<any>;
  signEvent(event_json: string): Promise<string>;
  getAuthHeader(url: string, method: string, body: any): Promise<string>;
  readonly nip04: Nip04Methods;
  readonly nip44: Nip44Methods;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_nostrclientwrapper_free: (a: number, b: number) => void;
  readonly nostrclientwrapper_new: () => number;
  readonly nostrclientwrapper_initialize: (a: number, b: number, c: number, d: number) => any;
  readonly nostrclientwrapper_getPrivateKey: (a: number) => [number, number, number, number];
  readonly nostrclientwrapper_getPublicKey: (a: number) => any;
  readonly nostrclientwrapper_getRelays: (a: number) => any;
  readonly nostrclientwrapper_signEvent: (a: number, b: number, c: number) => any;
  readonly nostrclientwrapper_getAuthHeader: (a: number, b: number, c: number, d: number, e: number, f: any) => any;
  readonly nostrclientwrapper_nip04: (a: number) => number;
  readonly nostrclientwrapper_nip44: (a: number) => number;
  readonly __wbg_nip04methods_free: (a: number, b: number) => void;
  readonly nip04methods_encrypt: (a: number, b: number, c: number, d: number, e: number) => any;
  readonly nip04methods_decrypt: (a: number, b: number, c: number, d: number, e: number) => any;
  readonly __wbg_nip44methods_free: (a: number, b: number) => void;
  readonly nip44methods_encrypt: (a: number, b: number, c: number, d: number, e: number) => any;
  readonly nip44methods_decrypt: (a: number, b: number, c: number, d: number, e: number) => any;
  readonly main: () => void;
  readonly rustsecp256k1_v0_10_0_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_10_0_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_10_0_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_10_0_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_4: WebAssembly.Table;
  readonly __wbindgen_export_5: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly closure321_externref_shim: (a: number, b: number, c: any) => void;
  readonly closure391_externref_shim: (a: number, b: number, c: any) => void;
  readonly _dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h59a7f8fc02cdf3e5: (a: number, b: number) => void;
  readonly closure725_externref_shim: (a: number, b: number, c: any) => void;
  readonly closure737_externref_shim: (a: number, b: number, c: any, d: any) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
