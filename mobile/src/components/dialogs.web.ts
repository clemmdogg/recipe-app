/*
 * The browser version of dialogs.ts: React Native's Alert does nothing on the web, so this uses
 * the browser's own dialogs. They can't have custom button labels, so the question carries the
 * meaning ("OK" goes ahead).
 */

export function showMessage(title: string, message: string): void {
  window.alert(`${title}\n\n${message}`);
}

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
};

export function confirmAction({ title, message }: ConfirmOptions): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
