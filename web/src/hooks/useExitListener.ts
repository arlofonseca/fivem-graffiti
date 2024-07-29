import { noop } from '@/utils/misc';
import { useEffect, useRef } from 'react';
import { fetchNui } from '../utils/fetchNui';

type FrameVisibleSetter = (bool: boolean) => void;

const keys: string[] = ['Escape'];

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
