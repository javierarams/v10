import { PlayerJsVideo } from '../../media/playerjs-video';
import { safeDefine } from '../../registration/safe-define';

export class PlayerJsVideoElement extends PlayerJsVideo {
  static readonly tagName = 'playerjs-video';
}

safeDefine(PlayerJsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlayerJsVideoElement.tagName]: PlayerJsVideoElement;
  }
}
