import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { theme } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import JobListScreen from "./src/screens/JobListScreen";
import JobDetailScreen from "./src/screens/JobDetailScreen";
import CreateJobScreen from "./src/screens/CreateJobScreen";
import CameraScreen from "./src/screens/CameraScreen";
import AccountScreen from "./src/screens/AccountScreen";

export type AppStackParamList = {
  JobList: undefined;
  JobDetail: { jobId: string };
  CreateJob: undefined;
  Camera: { jobId: string };
};

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator();

function JobsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="JobList" component={JobListScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen as React.ComponentType<any>} />
      <Stack.Screen name="CreateJob" component={CreateJobScreen} />
      <Stack.Screen name="Camera" component={CameraScreen as React.ComponentType<any>} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  const AuthStackNav = createNativeStackNavigator();
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="SignUp" component={SignUpScreen} />
    </AuthStackNav.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
      }}
    >
      <Tab.Screen
        name="Jobs"
        component={JobsStack}
        options={{
          tabBarLabel: "Jobs",
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarLabel: "Account",
          tabBarIcon: () => null,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  return user ? <MainTabs /> : <AuthStack />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});
