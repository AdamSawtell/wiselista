import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import PrimaryButton from "../components/PrimaryButton";

export default function AccountScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Account</Text>
      </View>
      <View style={styles.content}>
        {user?.email && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Signed in as</Text>
            <Text style={[styles.email, { color: theme.colors.textPrimary }]}>{user.email}</Text>
          </View>
        )}
        <PrimaryButton label="Sign out" onPress={() => signOut()} variant="secondary" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
  },
  title: { ...theme.typography.titleLarge },
  content: { flex: 1, padding: theme.spacing.lg },
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
  },
  label: { ...theme.typography.caption, marginBottom: 4 },
  email: { ...theme.typography.bodyMedium },
});
