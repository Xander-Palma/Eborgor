import { View, Text, TouchableOpacity, StyleSheet, TextInput, Image } from "react-native"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

interface HeaderProps {
  searchQuery?: string
  onSearchChange?: (query: string) => void
  showSearch?: boolean
  userRole?: "admin" | "cashier"
}

export default function Header({ searchQuery = "", onSearchChange, showSearch = true, userRole = "cashier" }: HeaderProps) {
  return (
    <View style={[styles.header, !showSearch && styles.headerFixed]}>
      <View style={styles.headerLeft}>
        <View style={styles.logoCircle}>
          <Image source={require("../images/minute burger.png")} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View>
          <Image source={require("../images/MINBURG TYPOGRAPHY.png")} style={styles.brandImage} resizeMode="contain" />
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items..."
            value={searchQuery}
            onChangeText={onSearchChange}
          maxLength={100}
          />
        </View>
      )}

      <View style={styles.headerRight}>
        <TouchableOpacity style={userRole === "admin" ? styles.adminButton : styles.cashierButton}>
          <Text style={userRole === "admin" ? styles.adminButtonText : styles.cashierButtonText}>
            {userRole === "admin" ? "ADMIN" : "CASHIER"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace("/")}>
          <Ionicons name="log-out-outline" size={16} color="#6B7280" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: "none",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FCD34D",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  logoImage: {
    width: 30,
    height: 30,
  },
  brandImage: {
    width: 120,
    height: 100,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 25,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    borderWidth: 2,
    borderColor: "#D1D5DB",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1F2937",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  cashierButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cashierButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  adminButton: {
    backgroundColor: "#92400E",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  adminButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  logoutText: {
    color: "#6B7280",
    fontSize: 14,
  },
})
