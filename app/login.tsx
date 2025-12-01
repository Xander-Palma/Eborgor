"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ImageBackground, Image } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { router, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"

export default function LoginScreen() {
  const { role } = useLocalSearchParams()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<"admin" | "cashier">((role as "admin" | "cashier") || "cashier")

  useEffect(() => {
    if (role === "admin" || role === "cashier") {
      setSelectedRole(role)
    }
  }, [role])

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password")
      return
    }

    // Simple authentication logic
    if (selectedRole === "admin" && username === "admin" && password === "admin123") {
      // Store role in AsyncStorage
      await AsyncStorage.setItem("userRole", "admin")
      router.replace("/admin")
    } else if (selectedRole === "cashier" && username === "cashier" && password === "cashier123") {
      // Store role in AsyncStorage
      await AsyncStorage.setItem("userRole", "cashier")
      router.replace("/cashier")
    } else {
      Alert.alert("Error", "Invalid credentials")
    }
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../images/bg-welcome.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            {/* Brand / Logo */}
            <View style={styles.logoWrapper}>
              <Image
                source={require("../images/minute burger.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Role specific header */}
            <Text style={styles.roleBadge}>{selectedRole === "cashier" ? "Cashier Portal" : "Admin Console"}</Text>
            <Text style={styles.loginTitle}>
              {selectedRole === "cashier" ? "Cashier Sign In" : "Admin Sign In"}
            </Text>
            <Text style={styles.subtitle}>
              {selectedRole === "cashier"
                ? "Serve customers faster with your Minute Burger POS."
                : "Manage menus, inventory, and sales with full control."}
            </Text>

            {/* Input Fields */}
            <View style={styles.inputSection}>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={selectedRole === "cashier" ? "Cashier username" : "Admin username"}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Login Button with gradient */}
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <LinearGradient
                colors={selectedRole === "cashier" ? ["#FF9F1C", "#FF5F00"] : ["#111827", "#000000"]}
                style={styles.loginButtonGradient}
              >
                <Text style={styles.loginButtonText}>
                  {selectedRole === "cashier" ? "Sign in as Cashier" : "Sign in as Admin"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Switch role */}
            {selectedRole === "cashier" ? (
              <TouchableOpacity style={styles.switchRole} onPress={() => setSelectedRole("admin")}>
                <Text style={styles.switchRoleText}>
                  Want to manage the store? <Text style={styles.switchRoleEmphasis}>Sign in as ADMIN</Text>
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.switchRole} onPress={() => setSelectedRole("cashier")}>
                <Text style={styles.switchRoleText}>
                  Back to counter? <Text style={styles.switchRoleEmphasis}>Sign in as CASHIER</Text>
                </Text>
              </TouchableOpacity>
            )}

            {/* Demo Credentials */}
          </View>
        </View>
      </ImageBackground>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  card: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  logoWrapper: {
    alignItems: "center",
    marginBottom: 12,
  },
  logoImage: {
    width: "90%",
    height: 120,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 26,
  },
  roleSection: {
    width: "100%",
    marginBottom: 30,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  roleButtons: {
    flexDirection: "row",
    gap: 15,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  roleButtonActive: {
    backgroundColor: "#1F2937",
    borderColor: "#1F2937",
  },
  roleButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#92400E",
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  inputSection: {
    width: "100%",
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: "#1F2937",
  },
  loginButton: {
    width: "100%",
    borderRadius: 999,
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  loginButtonGradient: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  switchRole: {
    marginBottom: 18,
  },
  switchRoleText: {
    textAlign: "center",
    fontSize: 13,
    color: "#4B5563",
  },
  switchRoleEmphasis: {
    color: "#B45309",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  demoSection: {
    alignItems: "center",
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 5,
  },
  demoText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 2,
  },
})
