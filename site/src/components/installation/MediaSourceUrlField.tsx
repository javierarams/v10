import { Input } from '@base-ui/react/input';
import { articleFor, detectRenderer, getInstallationPreset, type Renderer, type UseCase } from '@videojs/installation';
import { useEffect, useRef, useState } from 'react';

import LinkSquare from '@/assets/icons/link-square.svg?react';
import { media, sourceUrl } from '@/stores/installation';

import { useSelection } from './useSelection';

/** How long typing may pause before the draft URL reaches the preview. */
const COMMIT_DELAY_MS = 500;

/** The media sources a preset offers, narrowed to `supportedRenderers` when a guide supports fewer. */
export function availableRenderers(useCase: UseCase, supportedRenderers?: readonly Renderer[]): readonly Renderer[] {
  const renderers = getInstallationPreset(useCase).renderers;

  return supportedRenderers ? renderers.filter((renderer) => supportedRenderers.includes(renderer)) : renderers;
}

interface Props {
  /** The input's id, unique on the page. */
  id: string;
  supportedRenderers?: readonly Renderer[] | undefined;
  /** Where the reader picks the media source by hand, which the detection hint points to. */
  choicesLocation: 'below' | 'in the prompt';
}

/** The media URL input. A new URL selects the media source it looks like when the preset offers it. */
export default function MediaSourceUrlField({ id, supportedRenderers, choicesLocation }: Props) {
  const $renderer = useSelection('media');
  const $useCase = useSelection('useCase');
  const $sourceUrl = useSelection('sourceUrl');

  // The input edits a local draft and commits to the store after a pause, or at once on paste, blur, or Enter. The
  // preview reloads its media on every store change, and a half-typed URL fails the media URL safety check, opens
  // the player's error dialog, and pulls focus out of the field mid-word.
  const [draft, setDraft] = useState($sourceUrl);
  const [syncedUrl, setSyncedUrl] = useState($sourceUrl);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // An outside write to the store, such as a finished Mux upload, replaces the draft. Adjusting state during render is
  // the sanctioned way to derive it from a changed input.
  if ($sourceUrl !== syncedUrl) {
    setSyncedUrl($sourceUrl);
    setDraft($sourceUrl);
  }

  const renderers = availableRenderers($useCase, supportedRenderers);
  const detection = detectRenderer($sourceUrl, $useCase);

  function clearCommitTimer() {
    if (commitTimer.current === null) return;

    clearTimeout(commitTimer.current);
    commitTimer.current = null;
  }

  function commit(value: string) {
    clearCommitTimer();

    if (value === sourceUrl.get()) return;

    const detected = detectRenderer(value, $useCase)?.renderer;

    sourceUrl.set(value);

    if (detected && renderers.includes(detected)) media.set(detected);
  }

  function scheduleCommit(value: string) {
    const base = sourceUrl.get();

    clearCommitTimer();
    // An outside write during the pause, such as a finished Mux upload, replaces the draft, so the stale one is dropped.
    commitTimer.current = setTimeout(() => {
      if (sourceUrl.get() === base) commit(value);
    }, COMMIT_DELAY_MS);
  }

  useEffect(() => () => clearCommitTimer(), []);

  const hasUrl = $sourceUrl.trim().length > 0;
  const detectedAvailable = detection !== null && renderers.includes(detection.renderer);
  const showDetectionMatch = hasUrl && detection && detection.renderer === $renderer;
  const showDetectionSuggestion = hasUrl && detection && detectedAvailable && detection.renderer !== $renderer;
  const showNoMatch = hasUrl && !detection;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-p3 font-semibold">
        Paste a media URL to detect its source type
      </label>
      <div className="relative">
        <LinkSquare
          className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="url"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            scheduleCommit(e.target.value);
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text').trim();
            if (!pasted) return;

            e.preventDefault();
            setDraft(pasted);
            commit(pasted);
          }}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(draft);
          }}
          placeholder="https://stream.mux.com/….m3u8"
          className="corner-squircle border-line bg-surface text-p3 placeholder:text-muted intent:border-line-strong focus-visible:border-line-strong focus-visible:outline-gold h-10 w-full rounded-lg border pr-3 pl-9 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1"
        />
      </div>
      <p className="text-p4 dark:text-muted" aria-live="polite">
        {showDetectionMatch ? (
          <>
            This looks like {articleFor(detection.renderer)}{' '}
            <strong className="font-semibold">{detection.label}</strong> link, selected {choicesLocation}.
          </>
        ) : showDetectionSuggestion ? (
          <>
            This looks like {articleFor(detection.renderer)} {detection.label} link.{' '}
            <button
              type="button"
              onClick={() => media.set(detection.renderer)}
              className="intent:decoration-gold cursor-pointer underline"
            >
              Select {detection.label}
            </button>
          </>
        ) : showNoMatch ? (
          `We couldn't detect the source type. Pick one ${choicesLocation}.`
        ) : (
          'Optional. The URL also ends up in your generated code.'
        )}
      </p>
    </div>
  );
}
