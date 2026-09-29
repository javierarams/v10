import type { Skin, SkinSource, Styling } from '@app/types';

import { packageSkinTag, type SkinPreset, skinPreset } from './skin-tags';
import { loadAudioStylesheets, loadVideoStylesheets } from './stylesheets';

export interface HtmlSkinRequest {
  readonly player: 'video' | 'audio';
  readonly live: boolean;
  readonly skin: Skin;
  readonly styling: Styling;
  readonly source: SkinSource;
}

/** The framework package's skin modules, which register the custom element for each preset and skin. */
const packageSkins = {
  'video/default': () => import('@videojs/html/video/skin'),
  'video/minimal': () => import('@videojs/html/video/minimal-skin'),
  'video/starter': () => import('@videojs/html/video/starter-skin'),
  'live-video/default': () => import('@videojs/html/live-video/skin'),
  'live-video/minimal': () => import('@videojs/html/live-video/minimal-skin'),
  'live-video/starter': () => import('@videojs/html/live-video/starter-skin'),
  'audio/default': () => import('@videojs/html/audio/skin'),
  'audio/minimal': () => import('@videojs/html/audio/minimal-skin'),
  'audio/starter': () => import('@videojs/html/audio/starter-skin'),
  'live-audio/default': () => import('@videojs/html/live-audio/skin'),
  'live-audio/minimal': () => import('@videojs/html/live-audio/minimal-skin'),
  'live-audio/starter': () => import('@videojs/html/live-audio/starter-skin'),
} satisfies Partial<Record<`${SkinPreset}/${Skin}`, () => Promise<unknown>>>;

async function loadPackageSkin({ player, live, skin }: HtmlSkinRequest, preset: SkinPreset): Promise<string> {
  const load = packageSkins[`${preset}/${skin}`];
  if (!load) throw new Error(`Package skin ${preset}/${skin} is unavailable.`);

  await load();
  await (player === 'audio' ? loadAudioStylesheets(skin, live) : loadVideoStylesheets(skin, live));

  return packageSkinTag(preset, skin);
}

async function loadRegistrySkin({ skin }: HtmlSkinRequest, preset: SkinPreset): Promise<string> {
  const { loadRegistrySkinTag } = await import('./registry-skins');

  return loadRegistrySkinTag(preset, skin);
}

async function loadAuthoredSkin({ skin, styling }: HtmlSkinRequest, preset: SkinPreset): Promise<string> {
  const { loadAuthoredHtmlSkinTag } = await import('./authored-skins');

  return loadAuthoredHtmlSkinTag(preset, skin, styling);
}

/**
 * Loads and registers the skin a page asked for and returns its custom element tag name. The html registry publishes
 * one CSS flavour, so its `styling` is not consulted; the packages ship CSS only.
 */
export function loadHtmlSkinTag(request: HtmlSkinRequest): Promise<string> {
  const preset = skinPreset(request.player, request.live);

  switch (request.source) {
    case 'package':
      return loadPackageSkin(request, preset);
    case 'registry':
      return loadRegistrySkin(request, preset);
    case 'authored':
      return loadAuthoredSkin(request, preset);
  }
}
