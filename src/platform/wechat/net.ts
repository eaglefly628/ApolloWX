import type { SyncChannel, StateSyncMsg } from '@net/state-sync.js';
import type { WxSocketTask } from './wx.js';

// 微信小游戏状态同步通道 —— 用 wx.connectSocket 承载 state-sync 的消息搬运。
// 实现 SyncChannel 契约（post / onMessage / close），与浏览器 WebSocket 通道等价、对 sim 透明。
// 仅做传输；确定性/排序由 StateSyncSession 与 lockstep 纪律保证。
export class WechatSyncChannel implements SyncChannel {
  private readonly task: WxSocketTask;
  private listener: ((msg: StateSyncMsg) => void) | null = null;
  private open = false;
  private readonly pending: string[] = []; // 连接就绪前缓冲待发消息

  constructor(url: string, protocols?: string[]) {
    this.task = wx.connectSocket({ url, protocols });
    this.task.onOpen(() => {
      this.open = true;
      for (const data of this.pending) this.task.send({ data });
      this.pending.length = 0;
    });
    this.task.onMessage((res) => {
      if (typeof res.data !== 'string') return; // 仅处理文本帧
      try {
        this.listener?.(JSON.parse(res.data) as StateSyncMsg);
      } catch {
        // 坏帧丢弃，不炸主循环。
      }
    });
    this.task.onClose(() => {
      this.open = false;
    });
  }

  post(msg: StateSyncMsg): void {
    const data = JSON.stringify(msg);
    if (this.open) this.task.send({ data });
    else this.pending.push(data);
  }

  onMessage(cb: (msg: StateSyncMsg) => void): void {
    this.listener = cb;
  }

  close(): void {
    this.task.close();
    this.open = false;
  }
}
