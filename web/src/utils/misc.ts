import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const isEnvBrowser: () => boolean = (): boolean => !(window as any).invokeNative;
export const noop: () => void = (): void => {};
