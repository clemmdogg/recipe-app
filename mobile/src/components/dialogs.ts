import { Alert } from 'react-native';

/*
 * Simple dialogs that work everywhere. React Native's Alert does nothing in a browser, so
 * dialogs.web.ts shows the browser's own dialogs instead. Use these, not Alert, in screens.
 */

/** Tells the user something, e.g. that an action failed. */
export function showMessage(title: string, message: string): void {
  Alert.alert(title, message);
}

type ConfirmOptions = {
  title: string;
  message: string;
  /** The label of the button that goes ahead, e.g. "Leave". */
  confirmLabel: string;
  /** Shows the button as destructive (red on iOS), for actions that delete or remove. */
  destructive?: boolean;
};

/** Asks "are you sure?". Resolves true when the user goes ahead, false when they cancel. */
export function confirmAction({ title, message, confirmLabel, destructive = false }: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      // Android: tapping outside the dialog closes it, which counts as cancelling.
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
