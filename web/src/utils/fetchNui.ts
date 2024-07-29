import { isEnvBrowser } from './misc';

export async function fetchNui<T = any>(eventName: string, data?: any, mock?: { data: T; delay?: number }): Promise<T> {
  if (isEnvBrowser()) {
    if (!mock)
      return await new Promise(
        (resolve: (value: T | PromiseLike<T>) => void): ((value: T | PromiseLike<T>) => void) => resolve
      );
    await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, mock.delay));
    return mock.data;
  }

  const options = {
    method: 'post',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(data),
  };

  const name: any = (window as any).GetParentResourceName ? (window as any).GetParentResourceName() : 'nui-frame-app';
  const response: Response = await fetch(`https://${name}/${eventName}`, options);
  const format: any = await response.json();

  return format;
}
