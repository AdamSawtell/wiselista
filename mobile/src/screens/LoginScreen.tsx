import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import PrimaryButton from "../components/PrimaryButton";

export default function LoginScreen({ navigation }: { navigation: { navigate: (name: string) => void } }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Email and password required");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <Text style={[styles.brand, { color: theme.colors.primary }]}>wiselista</Text>
          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
            Listing-ready property photos
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Email</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
            placeholder="you@agency.com"
            placeholderTextColor={theme.colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>Password</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
            placeholder="Password"
            placeholderTextColor={theme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
          {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}
          <PrimaryButton label="Sign in" onPress={handleLogin} loading={loading} style={styles.signIn} />
          <PrimaryButton
            label="Create account"
            onPress={() => navigation.navigate("SignUp")}
            variant="ghost"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.spacing.xl,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  brandBlock: { marginBottom: theme.spacing.xxl },
  brand: { fontSize: 32, fontWeight: "700", letterSpacing: -1, marginBottom: theme.spacing.xs },
  tagline: { ...theme.typography.body },
  form: {},
  fieldLabel: { ...theme.typography.captionMedium, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: 14,
    fontSize: 16,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  error: { marginBottom: theme.spacing.md, fontSize: 14 },
  signIn: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs },
});
