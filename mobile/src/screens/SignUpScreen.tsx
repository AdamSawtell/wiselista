import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";

export default function SignUpScreen({ navigation }: { navigation: { navigate: (name: string) => void } }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();

  async function handleSignUp() {
    if (!email.trim() || !password) {
      setError("Email and password required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signUp(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
    else setSuccess(true);
  }

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.form}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            We sent a confirmation link to {email}
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.buttonText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.form}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Create account</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Sign up for Wiselista — property photos, AI-edited.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={theme.colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Sign up</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.link}>
          <Text style={[styles.linkText, { color: theme.colors.primaryLight }]}>
            Already have an account? Sign in
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: theme.spacing.xl },
  form: { maxWidth: 400, width: "100%", alignSelf: "center" },
  title: { ...theme.typography.titleLarge, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body, marginBottom: theme.spacing.xl },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    fontSize: 16,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  error: { color: theme.colors.error, marginBottom: theme.spacing.md, fontSize: 14 },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: theme.colors.textOnPrimary, ...theme.typography.bodyMedium },
  link: { marginTop: theme.spacing.lg, alignItems: "center" },
  linkText: { ...theme.typography.captionMedium },
});
