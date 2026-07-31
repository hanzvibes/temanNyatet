export type BottomNavScrollState = {
  lastScrollTop: number | null;
  offset: number;
  direction: 1 | -1 | null;
  directionTravel: number;
  engaged: boolean;
};

const SCROLL_THRESHOLD = 6;

export function getBottomNavMaxOffset(
  elementHeight: number,
  bottomGap: number,
): number {
  return Math.max(0, elementHeight + Math.max(0, bottomGap) + 1);
}

export function createBottomNavScrollState(): BottomNavScrollState {
  return {
    lastScrollTop: null,
    offset: 0,
    direction: null,
    directionTravel: 0,
    engaged: false,
  };
}

export function updateBottomNavScroll(
  state: BottomNavScrollState,
  scrollTop: number,
  maxOffset: number,
): BottomNavScrollState {
  const safeScrollTop = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0;
  const safeMaxOffset = Math.max(0, maxOffset);

  if (state.lastScrollTop === null) {
    return {
      lastScrollTop: safeScrollTop,
      offset: 0,
      direction: null,
      directionTravel: 0,
      engaged: false,
    };
  }

  if (safeScrollTop === 0) {
    return {
      lastScrollTop: 0,
      offset: 0,
      direction: null,
      directionTravel: 0,
      engaged: false,
    };
  }

  const delta = safeScrollTop - state.lastScrollTop;
  if (delta === 0) return state;

  const direction: 1 | -1 = delta > 0 ? 1 : -1;
  const distance = Math.abs(delta);

  if (state.direction !== direction) {
    const directionTravel = state.directionTravel + distance;
    if (directionTravel > SCROLL_THRESHOLD) {
      const nextOffset =
        state.offset + direction * (directionTravel - SCROLL_THRESHOLD);
      return {
        lastScrollTop: safeScrollTop,
        offset: Math.max(0, Math.min(safeMaxOffset, nextOffset)),
        direction,
        directionTravel: 0,
        engaged: true,
      };
    }

    return {
      lastScrollTop: safeScrollTop,
      offset: state.offset,
      direction,
      directionTravel,
      engaged: false,
    };
  }

  if (!state.engaged) {
    const directionTravel = state.directionTravel + distance;
    if (directionTravel <= SCROLL_THRESHOLD) {
      return {
        lastScrollTop: safeScrollTop,
        offset: state.offset,
        direction,
        directionTravel,
        engaged: false,
      };
    }

    const nextOffset = state.offset + direction * (directionTravel - SCROLL_THRESHOLD);
    return {
      lastScrollTop: safeScrollTop,
      offset: Math.max(0, Math.min(safeMaxOffset, nextOffset)),
      direction,
      directionTravel: 0,
      engaged: true,
    };
  }

  return {
    lastScrollTop: safeScrollTop,
    offset: Math.max(
      0,
      Math.min(safeMaxOffset, state.offset + direction * distance),
    ),
    direction,
    directionTravel: 0,
    engaged: true,
  };
}