/**
 * tests/helpers/ipc-mock.ts
 *
 * Denops IPC呼び出しのモックヘルパー
 *
 * denops.dispatch() 経由のVim/Neovim側メソッド呼び出しをモックする。
 * IPC契約（updateConfig, showHintsWithKey, generic bridge）のテストに使用。
 */

/**
 * IPCコール記録エントリ
 */
export interface IpcCallRecord {
  name: string;
  args: unknown[];
  timestamp: number;
}

/**
 * MockIpcDispatcher - denops.dispatch() のモック
 *
 * @example
 * ```typescript
 * const ipc = new MockIpcDispatcher();
 * ipc.onDispatch("updateConfig", (args) => ({ success: true }));
 * const result = await ipc.dispatch("updateConfig", [{ key: "a" }]);
 * ```
 */
export class MockIpcDispatcher {
  private handlers = new Map<string, (...args: unknown[]) => unknown>();
  private calls: IpcCallRecord[] = [];

  /**
   * ディスパッチハンドラーを登録する
   */
  onDispatch(name: string, handler: (...args: unknown[]) => unknown): void {
    this.handlers.set(name, handler);
  }

  /**
   * IPC呼び出しをシミュレートする
   */
  async dispatch(name: string, ...args: unknown[]): Promise<unknown> {
    this.calls.push({ name, args, timestamp: Date.now() });

    const handler = this.handlers.get(name);
    if (handler) {
      return handler(...args);
    }

    return undefined;
  }

  /**
   * 記録されたIPC呼び出しを取得する
   */
  getCalls(): IpcCallRecord[] {
    return [...this.calls];
  }

  /**
   * 特定メソッドへの呼び出し回数を取得する
   */
  getCallCount(name: string): number {
    return this.calls.filter((c) => c.name === name).length;
  }

  /**
   * 特定メソッドの最後の呼び出し引数を取得する
   */
  getLastCallArgs(name: string): unknown[] | undefined {
    const calls = this.calls.filter((c) => c.name === name);
    return calls.length > 0 ? calls[calls.length - 1].args : undefined;
  }

  /**
   * 呼び出しログをクリアする
   */
  clear(): void {
    this.calls = [];
  }
}

/**
 * IPC契約の3メソッドに対応したモック
 *
 * C-03: IPC契約3メソッド維持（updateConfig, showHintsWithKey, generic bridge）
 */
export class MockIpcContract {
  readonly dispatcher = new MockIpcDispatcher();

  private configUpdates: unknown[] = [];
  private hintsShown: Array<{ key: string; windowId?: number }> = [];
  private bridgeCalls: Array<{ method: string; args: unknown[] }> = [];

  constructor() {
    this.dispatcher.onDispatch("updateConfig", (config) => {
      this.configUpdates.push(config);
      return { success: true };
    });

    this.dispatcher.onDispatch("showHintsWithKey", (key, windowId) => {
      this.hintsShown.push({ key: key as string, windowId: windowId as number | undefined });
      return { success: true };
    });

    this.dispatcher.onDispatch("bridge", (method, ...args) => {
      this.bridgeCalls.push({ method: method as string, args });
      return { success: true };
    });
  }

  getConfigUpdates(): unknown[] {
    return [...this.configUpdates];
  }

  getHintsShown(): Array<{ key: string; windowId?: number }> {
    return [...this.hintsShown];
  }

  getBridgeCalls(): Array<{ method: string; args: unknown[] }> {
    return [...this.bridgeCalls];
  }

  reset(): void {
    this.configUpdates = [];
    this.hintsShown = [];
    this.bridgeCalls = [];
    this.dispatcher.clear();
  }
}
