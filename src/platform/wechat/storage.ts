import type { StoragePort, SaveGame, SaveMeta } from '@services/storage/storage-port.js';

// 微信小游戏存储后端 —— wx.setStorageSync / getStorageSync / removeStorageSync。
// 与 LocalStorageStoragePort 同纪律：键空间前缀隔离 + 一个索引键存所有槽位元数据；
// 两步写（数据→索引）任一步抛错则回滚，保证数据/索引不脱节。单 key 上限 1MB、总量 10MB（微信限制）。
export class WechatStoragePort implements StoragePort {
  constructor(private readonly prefix = 'apollo-save:') {}

  private key(slot: string): string {
    return this.prefix + slot;
  }
  private get indexKey(): string {
    return this.prefix + '__index__';
  }

  private read(key: string): string | null {
    const v = wx.getStorageSync(key);
    // wx 未命中返回 ''（而非 null）。
    return typeof v === 'string' && v.length > 0 ? v : null;
  }

  async save(slot: string, data: SaveGame): Promise<void> {
    const dataKey = this.key(slot);
    const prevData = this.read(dataKey); // 失败回滚用
    wx.setStorageSync(dataKey, JSON.stringify(data)); // 步骤1
    try {
      const index = await this.list();
      const next = index.filter((m) => m.slot !== slot);
      next.push(data.meta);
      wx.setStorageSync(this.indexKey, JSON.stringify(next)); // 步骤2
    } catch (e) {
      // 步骤2失败 → 回滚步骤1，杜绝"数据存在但索引无此条"的脱节。
      if (prevData === null) wx.removeStorageSync(dataKey);
      else wx.setStorageSync(dataKey, prevData);
      throw e;
    }
  }

  async load(slot: string): Promise<SaveGame | null> {
    const raw = this.read(this.key(slot));
    if (!raw) return null;
    // 存档可能被外部篡改/损坏：解析失败按"损坏存档"返回 null，绝不向上抛、炸毁存档界面。
    try {
      return JSON.parse(raw) as SaveGame;
    } catch {
      return null;
    }
  }

  async list(): Promise<SaveMeta[]> {
    const raw = this.read(this.indexKey);
    if (!raw) return [];
    try {
      const index = JSON.parse(raw) as SaveMeta[];
      return Array.isArray(index) ? index.sort((a, b) => b.timestamp - a.timestamp) : [];
    } catch {
      return []; // 索引损坏 → 当空，避免存档界面崩溃
    }
  }

  async delete(slot: string): Promise<void> {
    wx.removeStorageSync(this.key(slot));
    const index = (await this.list()).filter((m) => m.slot !== slot);
    wx.setStorageSync(this.indexKey, JSON.stringify(index));
  }
}
