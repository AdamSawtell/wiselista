import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";

export default function AccountScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Account</Text>
      </View>
      <View style={styles.content}>
        {user?.email && (
          <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{user.email}</Text>
        )}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.surfaceMuted }]}
          onPress={() => signOut()}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...theme.typography.title },
  content: { flex: 1, padding: theme.spacing.xl },
  email: { ...theme.typography.body, marginBottom: theme.spacing.xl },
  button: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  buttonText: { ...theme.typography.bodyMedium },
});
