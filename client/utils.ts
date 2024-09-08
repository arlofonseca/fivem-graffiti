export function netEvent<T extends any[]>(event: string, fn: (...args: T) => void): void {
  onNet(event, (...args: T): void => {
    if (!source || (source as any) == '') return;

    fn(...args);
  });
}
