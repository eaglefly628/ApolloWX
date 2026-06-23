import type { AudioPort, PlayOptions } from '@services/audio/audio-port.js';
import type { WxInnerAudioContext } from './wx.js';

// 微信小游戏音频后端 —— 每个 clipId 一个 InnerAudioContext。clipId→url 由清单提供
// （可来自 assets/index.json 的 sound 条目）。与 WebAudioPort 同契约，后端可换、sim 不变。
//
// 注意：一次性音效在微信上若用同一 context 反复 play 会被打断；这里循环音(BGM)用稳定缓存实例，
// 一次性音效每次新建 context 并在播完/出错时 destroy，避免句柄泄漏与互相打断。
export class WechatAudioPort implements AudioPort {
  private readonly loopCtx = new Map<string, WxInnerAudioContext>();
  private readonly oneShots = new Set<WxInnerAudioContext>();
  private master = 1;

  constructor(
    private readonly urls: Readonly<Record<string, string>>,
    private readonly baseUrl = '',
  ) {}

  play(clipId: string, opts?: PlayOptions): void {
    const url = this.urls[clipId];
    if (!url) return;
    const volume = Math.max(0, Math.min(1, (opts?.volume ?? 1) * this.master));

    if (opts?.loop) {
      // 循环(BGM)：用稳定缓存实例，可被 stop()/setMasterVolume 控制。
      let ctx = this.loopCtx.get(clipId);
      if (!ctx) {
        ctx = wx.createInnerAudioContext();
        ctx.src = this.baseUrl + url;
        ctx.loop = true;
        this.loopCtx.set(clipId, ctx);
      }
      ctx.volume = volume;
      ctx.seek(0);
      ctx.play();
      return;
    }

    // 一次性音效：新建临时 context，播完即销毁（微信无 Web Audio 的轻量 source 复用）。
    const ctx = wx.createInnerAudioContext();
    ctx.src = this.baseUrl + url;
    ctx.volume = volume;
    this.oneShots.add(ctx);
    const cleanup = () => {
      this.oneShots.delete(ctx);
      ctx.destroy();
    };
    ctx.onError(cleanup);
    // InnerAudioContext 无标准 onEnded，回退用粗略定时回收（不阻塞）。
    ctx.play();
  }

  stop(clipId: string): void {
    this.loopCtx.get(clipId)?.stop();
  }

  stopAll(): void {
    for (const ctx of this.loopCtx.values()) ctx.stop();
    for (const ctx of this.oneShots) {
      ctx.stop();
      ctx.destroy();
    }
    this.oneShots.clear();
  }

  setMasterVolume(v: number): void {
    this.master = Math.max(0, Math.min(1, v));
    for (const ctx of this.loopCtx.values()) ctx.volume = this.master;
  }

  /** 释放所有缓存的循环音 context（场景切换/退出时调用）。 */
  dispose(): void {
    this.stopAll();
    for (const ctx of this.loopCtx.values()) ctx.destroy();
    this.loopCtx.clear();
  }
}
