export const OVERLAY_EVENT = 'teman-nyatet:any-overlay';

export type OverlayEventDetail = {
  source: string;
  open: boolean;
  activeSources: string[];
};

let activeOverlaySources = new Set<string>();

export function updateOverlaySources(
  sources: readonly string[],
  source: string,
  open: boolean,
): string[] {
  const nextSources = new Set(sources);

  if (open) {
    nextSources.add(source);
  } else {
    nextSources.delete(source);
  }

  return [...nextSources];
}

export function getActiveOverlaySources(): string[] {
  return [...activeOverlaySources];
}

export function publishOverlayState(source: string, open: boolean): void {
  activeOverlaySources = new Set(
    updateOverlaySources([...activeOverlaySources], source, open),
  );

  window.dispatchEvent(
    new CustomEvent<OverlayEventDetail>(OVERLAY_EVENT, {
      detail: {
        source,
        open,
        activeSources: getActiveOverlaySources(),
      },
    }),
  );
}