import type { AssetDescriptor, AssetLoader } from '@assets/asset-types.js';
import type { ImageAssetHandle } from '@assets/image-loader.js';

// 微信小游戏图片加载器 —— 用 wx.createImage() 把描述符的 src 加载成可绘制图像。
// 句柄形态与浏览器 ImageAssetLoader 一致（{ image }），CanvasRenderer 走同一条 drawImage 路径。
// 仅微信小游戏环境可用（用到 wx.createImage）；Node/测试请用 StubAssetLoader。
export class WechatImageAssetLoader implements AssetLoader {
  /** 可选基址前缀（如 'assets/'）。微信本地包资源用相对路径，远程资源需先 downloadFile。 */
  constructor(private readonly baseUrl = '') {}

  load(
    descriptor: AssetDescriptor,
  ): Promise<{ handle: ImageAssetHandle; width: number; height: number }> {
    const url = this.baseUrl + descriptor.src;
    return new Promise((resolve, reject) => {
      const image = wx.createImage();
      image.onload = () =>
        resolve({
          // wx 图像在 wx canvas 2d 上下文中可直接作为 CanvasImageSource 绘制。
          handle: { image: image as unknown as CanvasImageSource },
          width: image.width,
          height: image.height,
        });
      image.onerror = () => reject(new Error(`WechatImageAssetLoader: 加载失败 "${url}"`));
      image.src = url;
    });
  }
}
