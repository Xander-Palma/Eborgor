import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useState, useEffect, useContext } from "react"
import Sidebar from "../../components/Sidebar"
import Header from "../../components/Header"
import { supabase } from "../../utils/supabaseClient"
import { InventoryRefreshContext } from "./index"
import { getProductImage } from "../../utils/constants"

interface InventoryItem {
  product_id: number
  name: string
  price: number
  category_name: string
  quantity_in_stock: number
  minimum_threshold: number
  last_restock_date: string | null
  last_updated: string
}

export default function Inventory() {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryTrigger, setRetryTrigger] = useState(0)

  const { setRefreshInventory } = useContext(InventoryRefreshContext)

  // Register refresh function with context
  useEffect(() => {
    const refreshFn = () => {
      console.log("🔄 Inventory refresh triggered!")
      setRetryTrigger(prev => prev + 1)
    }
    setRefreshInventory(() => refreshFn)
    console.log("📝 Inventory refresh function registered")
    return () => {
      setRefreshInventory(undefined)
      console.log("📝 Inventory refresh function unregistered")
    }
  }, [setRefreshInventory])

  useEffect(() => {
    const fetchInventory = async () => {
      console.log(`📦 Fetching inventory data (trigger: ${retryTrigger})...`)
      setLoading(true)
      setError(null)

      try {
        // First, get all active products
        const { data: activeProducts, error: productsError } = await supabase
          .from("product")
          .select(`
            product_id,
            name,
            price,
            category:category(name)
          `)
          .eq("is_active", true)

        if (productsError) throw productsError

        // Then get inventory data for these products
        const productIds = activeProducts?.map(p => p.product_id) || []
        const { data: inventoryData, error: inventoryError } = await supabase
          .from("inventory")
          .select(`
            product_id,
            quantity_in_stock,
            minimum_threshold,
            last_restock_date,
            last_updated
          `)
          .in("product_id", productIds)

        if (inventoryError) throw inventoryError

        // Create inventory map for quick lookup
        const inventoryMap = new Map()
        inventoryData?.forEach(inv => {
          inventoryMap.set(inv.product_id, inv)
        })

        if (error) {
          setError("Failed to load inventory data")
          console.error("Inventory fetch error:", error)
          return
        }

        console.log(`📊 Active products:`, activeProducts?.slice(0, 3).map((p: any) => ({
          product_id: p.product_id,
          name: p.name
        })))
        console.log(`📦 Inventory records:`, inventoryData?.slice(0, 3).map((inv: any) => ({
          product_id: inv.product_id,
          quantity_in_stock: inv.quantity_in_stock
        })))

        // Format data by merging products with inventory
        const formattedData: InventoryItem[] = (activeProducts || []).map((product: any) => {
          const inventory = inventoryMap.get(product.product_id)
          return {
            product_id: product.product_id,
            name: product.name,
            price: product.price,
            category_name: product.category?.name || "Uncategorized",
            quantity_in_stock: inventory?.quantity_in_stock || 0,
            minimum_threshold: inventory?.minimum_threshold || 10,
            last_restock_date: inventory?.last_restock_date,
            last_updated: inventory?.last_updated || new Date().toISOString(),
          }
        })

        console.log(`✅ Formatted inventory data:`, formattedData.slice(0, 3).map(item => ({
          id: item.product_id,
          name: item.name,
          stock: item.quantity_in_stock
        })))

        setInventoryData(formattedData)

        setInventoryData(formattedData)
      } catch (err) {
        setError("An unexpected error occurred")
        console.error("Inventory fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchInventory()
  }, [retryTrigger])


  const getStockStatus = (stock: number, threshold: number) => {
    if (stock <= threshold) return "low"
    if (stock <= threshold * 2) return "medium"
    return "high"
  }

  const getStockColor = (status: string) => {
    switch (status) {
      case "low":
        return "#EF4444"
      case "medium":
        return "#F59E0B"
      case "high":
        return "#10B981"
      default:
        return "#6B7280"
    }
  }

  const lowStockItems = inventoryData.filter((item) => item.quantity_in_stock <= item.minimum_threshold)
  const totalItems = inventoryData.length
  const totalValue = inventoryData.reduce((sum, item) => sum + item.price * item.quantity_in_stock, 0)

  if (loading) {
    return (
      <View style={styles.container}>
        <Sidebar />
        <View style={[styles.content, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={{ marginTop: 16, fontSize: 16, color: "#6B7280" }}>Loading inventory...</Text>
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Sidebar />
        <View style={[styles.content, { justifyContent: "center", alignItems: "center" }]}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={{ marginTop: 16, fontSize: 16, color: "#EF4444", textAlign: "center" }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#F97316", borderRadius: 8 }}
            onPress={() => setRetryTrigger(prev => prev + 1)}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Sidebar />
      <View style={styles.content}>
        <Header showSearch={false} />

        <View style={styles.pageHeader}>
          <View style={styles.headerContent}>
            <Ionicons name="cube" size={24} color="#F97316" />
            <Text style={styles.pageTitle}>Inventory Management</Text>
          </View>
          <Text style={styles.pageSubtitle}>Monitor and manage your stock levels</Text>
        </View>

        <ScrollView style={styles.inventoryContainer} showsVerticalScrollIndicator={false}>
          {/* Inventory Summary */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{totalItems}</Text>
              <Text style={styles.summaryLabel}>Total Items</Text>
              <Ionicons name="list" size={20} color="#2563EB" style={styles.summaryIcon} />
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{lowStockItems.length}</Text>
              <Text style={styles.summaryLabel}>Low Stock Alerts</Text>
              <Ionicons name="warning" size={20} color="#EF4444" style={styles.summaryIcon} />
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>₱{totalValue.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Inventory Value</Text>
              <Ionicons name="cash" size={20} color="#10B981" style={styles.summaryIcon} />
            </View>
          </View>

          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <View style={styles.alertSection}>
              <View style={styles.alertHeader}>
                <Ionicons name="warning" size={20} color="#EF4444" />
                <Text style={styles.alertTitle}>Low Stock Alerts</Text>
              </View>
              <View style={styles.alertItems}>
                {lowStockItems.map((item) => (
                  <View key={item.product_id} style={styles.alertItem}>
                    <View>
                      <Text style={styles.alertItemName}>{item.name}</Text>
                      <Text style={styles.alertItemStock}>{item.quantity_in_stock} remaining</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Inventory List */}
          <View style={styles.inventoryList}>
            <Text style={styles.sectionTitle}>All Items</Text>
            {inventoryData.map((item) => {
              const stockStatus = getStockStatus(item.quantity_in_stock, item.minimum_threshold)
              const stockColor = getStockColor(stockStatus)

              return (
                <View key={item.product_id} style={styles.inventoryItem}>
                  <View style={styles.itemLeft}>
                    <View style={styles.itemImage}>
                      <Image source={getProductImage(item.name)} style={styles.itemImageContent} resizeMode="contain" />
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemCategory}>{item.category_name}</Text>
                      <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
                    </View>
                  </View>

                  <View style={styles.itemRight}>
                    <View style={styles.stockInfo}>
                      <Text style={[styles.stockNumber, { color: stockColor }]}>{item.quantity_in_stock}</Text>
                      <Text style={styles.stockLabel}>in stock</Text>
                    </View>

                    <View style={[styles.stockIndicator, { backgroundColor: stockColor }]} />
                  </View>
                </View>
              )
            })}
          </View>
        </ScrollView>
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
    paddingTop: 70,
  },
  pageHeader: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginLeft: 12,
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  inventoryContainer: {
    flex: 1,
    padding: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  summaryIcon: {
    position: "absolute",
    top: 20,
    right: 20,
  },
  alertSection: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#DC2626",
    marginLeft: 8,
  },
  alertItems: {
    gap: 8,
  },
  alertItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
  },
  alertItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  alertItemStock: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "600",
  },
  inventoryList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  inventoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemImage: {
    width: 50,
    height: 50,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  itemImageContent: {
    width: "100%",
    height: "100%",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#F97316",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stockInfo: {
    alignItems: "center",
  },
  stockNumber: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  stockLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
