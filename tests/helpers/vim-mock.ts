/**
 * tests/helpers/vim-mock.ts
 *
 * VimScript関数呼び出しのモックヘルパー
 *
 * autoload/hellshake_yano_vim/ 層のVimScript関数を
 * TypeScript側からモックするためのユーティリティ。
 * Phase 1-4の移行テストで移行前後の動作比較に使用する。
 */

/**
 * VimScript関数の呼び出し記録
 */
export interface VimScriptCallRecord {
  func: string;
  args: unknown[];
  result: unknown;
}

/**
 * MockVimScriptLayer - autoload/hellshake_yano_vim/ のモック
 *
 * @example
 * ```typescript
 * const vimLayer = new MockVimScriptLayer();
 * vimLayer.mockFunction("hellshake_yano_vim#core#init", () => 1);
 * const result = await vimLayer.call("hellshake_yano_vim#core#init", []);
 * ```
 */
export class MockVimScriptLayer {
  private functions = new Map<string, (...args: unknown[]) => unknown>();
  private callLog: VimScriptCallRecord[] = [];

  /**
   * VimScript関数のモックを登録する
   *
   * @param funcName autoload形式の関数名（例: 'hellshake_yano_vim#core#init'）
   * @param handler モック実装
   */
  mockFunction(funcName: string, handler: (...args: unknown[]) => unknown): void {
    this.functions.set(funcName, handler);
  }

  /**
   * VimScript関数呼び出しをシミュレートする
   */
  async call(funcName: string, args: unknown[] = []): Promise<unknown> {
    const handler = this.functions.get(funcName);
    const result = handler ? handler(...args) : 0;

    this.callLog.push({ func: funcName, args, result });
    return result;
  }

  /**
   * 呼び出しログを取得する
   */
  getCalls(): VimScriptCallRecord[] {
    return [...this.callLog];
  }

  /**
   * 特定関数の呼び出し回数を取得する
   */
  getCallCount(funcName: string): number {
    return this.callLog.filter((r) => r.func === funcName).length;
  }

  /**
   * ログをクリアする
   */
  clear(): void {
    this.callLog = [];
  }
}

/**
 * カテゴリ1関数（21関数）の標準モック
 *
 * Phase 1の集約テストで、移行前のVimScript側動作をシミュレートする。
 */
export function createCategory1Mocks(): MockVimScriptLayer {
  const layer = new MockVimScriptLayer();

  // core 系
  layer.mockFunction("hellshake_yano_vim#core#init", () => 1);
  layer.mockFunction("hellshake_yano_vim#core#show", () => 1);
  layer.mockFunction("hellshake_yano_vim#core#hide", () => 1);

  // motion 系
  layer.mockFunction("hellshake_yano_vim#motion#set_threshold", (_n: unknown) => 1);
  layer.mockFunction("hellshake_yano_vim#motion#set_timeout", (_n: unknown) => 1);

  // config 系
  layer.mockFunction("hellshake_yano_vim#config#get", (key: unknown) => key);
  layer.mockFunction("hellshake_yano_vim#config#set", () => 1);
  layer.mockFunction("hellshake_yano_vim#config#update", () => 1);

  // dictionary 系
  layer.mockFunction("hellshake_yano_vim#dictionary#add", () => 1);
  layer.mockFunction("hellshake_yano_vim#dictionary#remove", () => 1);
  layer.mockFunction("hellshake_yano_vim#dictionary#clear", () => 1);
  layer.mockFunction("hellshake_yano_vim#dictionary#get_all", () => []);
  layer.mockFunction("hellshake_yano_vim#dictionary#show", () => 1);
  layer.mockFunction("hellshake_yano_vim#dictionary#validate", () => 1);

  // hint_generator 系
  layer.mockFunction("hellshake_yano_vim#hint_generator#generate", () => []);
  layer.mockFunction("hellshake_yano_vim#hint_generator#get_min_word_length", () => 2);

  // japanese 系
  layer.mockFunction("hellshake_yano_vim#japanese#segment", (text: unknown) => [text]);

  // word_detector 系
  layer.mockFunction("hellshake_yano_vim#word_detector#detect_visible", () => []);
  layer.mockFunction("hellshake_yano_vim#word_detector#detect_multi_window", () => []);
  layer.mockFunction("hellshake_yano_vim#word_detector#get_min_length", () => 2);
  layer.mockFunction("hellshake_yano_vim#word_detector#detect_words_visible", () => []);

  // window_detector 系
  layer.mockFunction("hellshake_yano_vim#window_detector#get_visible", () => []);

  return layer;
}
