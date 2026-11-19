import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/app-logo';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MinPasswordLength, useAuthForm } from '@/view-models/use-auth-form';

type AuthFormProps = {
  mode: 'signIn' | 'signUp';
};

const Texts = {
  signIn: {
    title: 'Welcome back',
    intro: 'Sign in to see your family’s recipes, plan, list and pantry.',
    submit: 'Sign in',
    switchPrompt: 'New here?',
    switchLabel: 'Create an account',
  },
  signUp: {
    title: 'Create your account',
    intro: 'You get your own household. Invite your family to it afterwards.',
    submit: 'Create account',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Sign in',
  },
} as const;

/** The sign-in and sign-up screens: the same form, with a name field when signing up. */
export function AuthForm({ mode }: AuthFormProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const form = useAuthForm(mode);
  const texts = Texts[mode];

  const switchMode = () => {
    if (mode === 'signIn') {
      router.push('/sign-up');
    } else {
      router.back();
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Spacing.five + (mode === 'signIn' ? insets.top : 0),
          paddingBottom: Spacing.four + insets.bottom,
          paddingLeft: Spacing.four + insets.left,
          paddingRight: Spacing.four + insets.right,
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <View style={styles.header}>
          <AppLogo />
          <ThemedText type="heading" accessibilityRole="header" style={styles.centered}>
            {texts.title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            {texts.intro}
          </ThemedText>
        </View>

        {mode === 'signUp' && (
          <TextField
            label="Your name"
            value={form.name}
            onChangeText={form.setName}
            placeholder="e.g. Anna"
            autoComplete="name"
            textContentType="givenName"
            autoCapitalize="words"
            returnKeyType="next"
          />
        )}
        <TextField
          label="Email"
          value={form.email}
          onChangeText={form.setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={form.password}
          onChangeText={form.setPassword}
          placeholder={mode === 'signUp' ? `At least ${MinPasswordLength} characters` : undefined}
          secureTextEntry
          autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={form.submit}
        />

        {form.error && (
          <ThemedText themeColor="error" accessibilityRole="alert" accessibilityLiveRegion="polite">
            {form.error}
          </ThemedText>
        )}

        <PrimaryButton label={texts.submit} onPress={form.submit} isBusy={form.isSubmitting} />

        <Pressable
          onPress={switchMode}
          accessibilityRole="button"
          accessibilityLabel={texts.switchLabel}
          hitSlop={8}
          style={({ pressed }) => [styles.switch, pressed && styles.pressed]}>
          <ThemedText themeColor="textSecondary">
            {texts.switchPrompt} <ThemedText style={styles.switchLabel}>{texts.switchLabel}</ThemedText>
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
  switch: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  switchLabel: {
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.6,
  },
});
