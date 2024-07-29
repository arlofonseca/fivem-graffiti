import { noop } from '@/utils/misc';
import { useEffect, useRef } from 'react';
import { fetchNui } from '../utils/fetchNui';

type FrameVisibleSetter = (bool: boolean) => void;

const keys: string[] = ['Escape'];

/**
 * A hook for listening to key presses and triggering actions, such as hiding a frame in NUI.
 *
 * @param visibleSetter - A function to set the visibility state of a frame.
 * @param cb - An optional callback function to be executed when a key press triggers an action.
 * @returns void
 */
export const useExitListener: (visibleSetter: FrameVisibleSetter, cb?: () => void) => void = (
  visibleSetter: FrameVisibleSetter,
  cb?: () => void
): void => {
  const setterRef: React.MutableRefObject<FrameVisibleSetter> = useRef<FrameVisibleSetter>(noop);

  useEffect((): void => {
    setterRef.current = visibleSetter;
  }, [visibleSetter]);

  useEffect((): (() => void) => {
    const keyHandler: (e: KeyboardEvent) => void = (e: KeyboardEvent): void => {
      if (keys.includes(e.code)) {
        setterRef.current(false);
        cb && cb();
        fetchNui('fivem-graffiti:nui:hideFrame');
      }
    };

    window.addEventListener('keyup', keyHandler);

    return (): void => window.removeEventListener('keyup', keyHandler);
  }, []);
};
