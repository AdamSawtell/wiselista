import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
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
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.brandCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={styles.logoMark}>W</Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Wiselista</Text>
          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
            Listing-ready property photos, enhanced with AI.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
            placeholder="Email"
            placeholderTextColor={theme.colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
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
            label="Create an account"
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
  brandCard: {
    alignItems: "center",
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.xl,
  },
  logoMark: {
    width: 56,
    height: 56,
    lineHeight: 56,
    textAlign: "center",
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    color: theme.colors.textOnPrimary,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
    overflow: "hidden",
  },
  title: { ...theme.typography.titleLarge, marginBottom: theme.spacing.xs },
  tagline: { ...theme.typography.body, textAlign: "center" },
  form: { gap: 0 },
  input: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
  error: { marginBottom: theme.spacing.md, fontSize: 14 },
  signIn: { marginBottom: theme.spacing.sm },
});
