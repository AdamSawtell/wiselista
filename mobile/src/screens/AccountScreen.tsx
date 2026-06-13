import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import {
  fetchProfile,
  saveProfile,
  type AgentProfileInput,
} from "../lib/profile";

const emptyForm = (): AgentProfileInput => ({
  full_name: "",
  business_name: "",
  role_title: "",
  phone: "",
  business_url: "",
  business_address: "",
});

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const [form, setForm] = useState<AgentProfileInput>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function loadProfile() {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchProfile(user.id);
      if (profile) {
        setForm({
          full_name: profile.full_name ?? "",
          business_name: profile.business_name ?? "",
          role_title: profile.role_title ?? "",
          phone: profile.phone ?? "",
          business_url: profile.business_url ?? "",
          business_address: profile.business_address ?? "",
        });
      } else {
        setForm(emptyForm());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [user?.id])
  );

  useEffect(() => {
    void loadProfile();
  }, [user?.id]);

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveProfile(user.id, form);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof AgentProfileInput>(key: K, value: AgentProfileInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.kicker, { color: theme.colors.primary }]}>Account</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Your agent profile</Text>
        {user?.email && (
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{user.email}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            Shown on share links you send to clients with your property photos.
          </Text>

          <ProfileField
            label="Your name *"
            value={form.full_name}
            onChangeText={(v) => updateField("full_name", v)}
            placeholder="Adam Sawtell"
          />
          <ProfileField
            label="Agency or business name *"
            value={form.business_name}
            onChangeText={(v) => updateField("business_name", v)}
            placeholder="Ray White Inner West"
          />
          <ProfileField
            label="Role or title"
            value={form.role_title ?? ""}
            onChangeText={(v) => updateField("role_title", v)}
            placeholder="Licensed Sales Agent"
          />
          <ProfileField
            label="Phone number"
            value={form.phone ?? ""}
            onChangeText={(v) => updateField("phone", v)}
            placeholder="0412 345 678"
            keyboardType="phone-pad"
          />
          <ProfileField
            label="Business website or profile link"
            value={form.business_url ?? ""}
            onChangeText={(v) => updateField("business_url", v)}
            placeholder="www.youragency.com.au"
            autoCapitalize="none"
          />
          <ProfileField
            label="Office address"
            value={form.business_address ?? ""}
            onChangeText={(v) => updateField("business_address", v)}
            placeholder="123 Main Street, Sydney"
          />

          {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}
          {saved && (
            <Text style={[styles.saved, { color: theme.colors.success }]}>
              Profile saved. Client share links will show your updated details.
            </Text>
          )}

          <PrimaryButton label="Save profile" onPress={handleSave} loading={saving} style={styles.save} />
          <PrimaryButton label="Sign out" onPress={() => signOut()} variant="secondary" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ProfileField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "email-address" | "url";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.colors.textPrimary,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "words"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
  },
  kicker: { ...theme.typography.label, marginBottom: theme.spacing.xs },
  title: { ...theme.typography.titleLarge },
  subtitle: { ...theme.typography.caption, marginTop: theme.spacing.xs },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  hint: { ...theme.typography.body, marginBottom: theme.spacing.lg },
  field: { marginBottom: theme.spacing.md },
  label: { ...theme.typography.captionMedium, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: 14,
    fontSize: 16,
  },
  error: { ...theme.typography.caption, marginBottom: theme.spacing.sm },
  saved: { ...theme.typography.caption, marginBottom: theme.spacing.sm },
  save: { marginBottom: theme.spacing.sm },
});
