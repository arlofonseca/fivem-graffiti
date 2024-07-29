import { isEnvBrowser } from '@/utils/misc';
import { atom, useAtomValue, useSetAtom } from 'jotai';

const visible = atom<boolean>(isEnvBrowser());

export const creationFrameState: () => boolean = (): boolean => useAtomValue(visible);
export const setCreationFrameState = () => useSetAtom(visible);
