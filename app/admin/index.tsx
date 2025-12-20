import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Image, ActivityIndicator } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useState, useEffect } from "react"
import { supabase } from "../../utils/supabaseClient"

const { width, height } = Dimensions.get("window")

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todaySales: 0,
    ordersToday: 0,
    activeStaff: 0,
    lowStockItems: 0,
  })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.toISOString()
      const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()

      // Fetch today's sales and orders
      const { data: todayOrders, error: ordersError } = await supabase
        .from("orders")
        .select("total_amount, order_id")
        .gte("order_date", todayStart)
        .lt("order_date", todayEnd)
        .eq("status", "Completed")

      if (ordersError) {
        console.error("Error fetching today's orders:", ordersError)
      }

      const todaySales = todayOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const ordersToday = todayOrders?.length || 0

      // Fetch active staff (cashiers + admins)
      const [cashiersResult, adminsResult] = await Promise.all([
        supabase
          .from("cashier")
          .select("cashier_id")
          .eq("is_active", true),
        supabase
          .from("admin")
          .select("admin_id")
          .eq("is_active", true),
      ])

      const activeCashiers = cashiersResult.data?.length || 0
      const activeAdmins = adminsResult.data?.length || 0
      const activeStaff = activeCashiers + activeAdmins

      // Fetch low stock items (inventory items below minimum threshold)
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("quantity_in_stock, minimum_threshold")

      if (inventoryError) {
        console.error("Error fetching inventory:", inventoryError)
      }

      // Filter items where quantity_in_stock is less than minimum_threshold
      const lowStockItems = inventoryData?.filter(
        (item) => (item.quantity_in_stock || 0) < (item.minimum_threshold || 0)
      ).length || 0

      setStats({
        todaySales,
        ordersToday,
        activeStaff,
        lowStockItems,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const adminFeatures = [
    {
      title: "User Management",
      description: "Manage staff accounts and permissions",
      icon: "people",
      color: "#3B82F6",
      gradient: ["#3B82F6", "#1E40AF"],
    },
    {
      title: "Sales Analytics",
      description: "View detailed sales reports and analytics",
      icon: "analytics",
      color: "#10B981",
      gradient: ["#10B981", "#047857"],
    },
    {
      title: "Menu Management",
      description: "Add, edit, or remove menu items",
      icon: "restaurant",
      color: "#F59E0B",
      gradient: ["#F59E0B", "#D97706"],
    },
    {
      title: "Inventory Control",
      description: "Monitor and manage inventory levels",
      icon: "cube",
      color: "#8B5CF6",
      gradient: ["#8B5CF6", "#6D28D9"],
    },
  ]

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#FCD34D", "#F59E0B"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoCircle}>
              <Image source={require("../../images/minute burger.png")} style={styles.logoImage} resizeMode="contain" />
            </View>
            <View>
              <Image source={require("../../images/MINBURG TYPOGRAPHY.png")} style={styles.brandImage} resizeMode="contain" />
              <Text style={styles.adminLabel}>Admin Dashboard</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace("/")}>
            <Ionicons name="log-out-outline" size={20} color="#92400E" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome, Administrator</Text>
          <Text style={styles.welcomeSubtitle}>Manage your restaurant operations from this central dashboard</Text>
        </View>

        <View style={styles.featuresGrid}>
          {adminFeatures.map((feature, index) => (
            <TouchableOpacity
              key={index}
              style={styles.featureCard}
              activeOpacity={0.7}
              onPress={() => {
                // Navigate to specific admin feature
                if (feature.title === "User Management") {
                  router.push("/admin/users")
                } else if (feature.title === "Sales Analytics") {
                  router.push("/admin/sales")
                } else if (feature.title === "Menu Management") {
                  router.push("/admin/menu")
                } else if (feature.title === "Inventory Control") {
                  router.push("/admin/inventory")
                } else {
                  console.log(`Navigate to ${feature.title}`)
                }
              }}
            >
              <LinearGradient colors={feature.gradient as [string, string]} style={styles.featureCardGradient}>
                <View style={styles.featureCardContent}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name={feature.icon as any} size={32} color="#FFFFFF" />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#FFFFFF" style={styles.featureChevron} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F59E0B" />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="cash" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.statNumber}>₱{stats.todaySales.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Today's Sales</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="list" size={24} color="#10B981" />
                </View>
                <Text style={styles.statNumber}>{stats.ordersToday}</Text>
                <Text style={styles.statLabel}>Orders Today</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="people" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.statNumber}>{stats.activeStaff}</Text>
                <Text style={styles.statLabel}>Active Staff</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="warning" size={24} color="#EF4444" />
                </View>
                <Text style={styles.statNumber}>{stats.lowStockItems}</Text>
                <Text style={styles.statLabel}>Low Stock Items</Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Access to POS */}
        <View style={styles.posSection}>
          <LinearGradient colors={["#1F2937", "#111827"]} style={styles.posButtonGradient}>
            <TouchableOpacity style={styles.posButton} onPress={() => router.push("/cashier")} activeOpacity={0.8}>
              <Ionicons name="storefront" size={28} color="#FFFFFF" />
              <Text style={styles.posButtonText}>Access POS System</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    width: 140,
    height: 20,
    marginBottom: 2,
  },
  adminLabel: {
    fontSize: 14,
    color: "#A16207",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    marginLeft: 5,
    color: "#92400E",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeSection: {
    paddingVertical: 30,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  featuresGrid: {
    marginBottom: 30,
  },
  featureCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  featureCardGradient: {
    padding: 24,
  },
  featureCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
  },
  featureChevron: {
    opacity: 0.7,
  },
  statsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  posSection: {
    alignItems: "center",
    paddingBottom: 30,
  },
  posButtonGradient: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  posButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 18,
    justifyContent: "center",
  },
  posButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
})
