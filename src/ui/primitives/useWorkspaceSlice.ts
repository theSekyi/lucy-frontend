import { useEffect, useRef, useState } from 'preact/hooks';
import type { WorkspaceState } from '../../core/types';
import type { WorkspaceController } from '../../core/workspace';

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== 'object' ||
    a === null ||
    typeof b !== 'object' ||
    b === null
  ) {
    return false;
  }
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Subscribes a component to a narrow slice of WorkspaceState so keystrokes in
 * Composer never re-render heavy tables, grids, or sidebars.
 */
export function useWorkspaceSlice<TSlice>(
  workspace: WorkspaceController,
  selector: (state: WorkspaceState) => TSlice,
  isEqual: (a: TSlice, b: TSlice) => boolean = shallowEqual
): TSlice {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const isEqualRef = useRef(isEqual);
  isEqualRef.current = isEqual;

  const [slice, setSlice] = useState<TSlice>(() => selector(workspace.getState()));
  const prevSliceRef = useRef<TSlice>(slice);

  useEffect(() => {
    const initialNext = selectorRef.current(workspace.getState());
    if (!isEqualRef.current(prevSliceRef.current, initialNext)) {
      prevSliceRef.current = initialNext;
      setSlice(initialNext);
    }

    return workspace.subscribe((state) => {
      const next = selectorRef.current(state);
      if (!isEqualRef.current(prevSliceRef.current, next)) {
        prevSliceRef.current = next;
        setSlice(next);
      }
    });
  }, [workspace]);

  return slice;
}
