import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal, ActivityIndicator, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { supabase } from "../../utils/supabaseClient"

interface Category {
  category_id: number
  name: string
  description: string | null
  is_active: boolean
}

interface Product {
  product_id: number
  name: string
  description: string | null
  price: number
  category_id: number | null
  category?: Category
  image_url: string | null
  item_code: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function MenuManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    image_url: "",
    item_code: "",
    is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [newCategoryName, setNewCategoryName] = useState<string>("")

  const sanitizeMoneyInput = (text: string): string => {
    // Allow only digits and a single decimal point, with max 2 decimal places
    let cleaned = text.replace(/[^0-9.]/g, "")

    // If starts with a dot, prefix with 0
    if (cleaned.startsWith(".")) {
      cleaned = "0" + cleaned
    }

    const parts = cleaned.split(".")
    if (parts.length > 1) {
      // Keep only first dot and limit to two decimal places
      cleaned = parts[0] + "." + parts[1].slice(0, 2)
    }

    // Hard cap total length to prevent huge numbers (e.g. 9999999999.99)
    if (cleaned.length > 12) {
      cleaned = cleaned.slice(0, 12)
    }

    return cleaned
  }

  // Fetch products and categories
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch products with categories
      const { data: productsData, error: productsError } = await supabase
        .from("product")
        .select(`
          product_id,
          name,
          description,
          price,
          category_id,
          image_url,
          item_code,
          is_active,
          created_at,
          updated_at,
          category:category(
            category_id,
            name,
            description,
            is_active
          )
        `)
        .order("created_at", { ascending: false })

      if (productsError) throw productsError

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("category")
        .select("category_id, name, description, is_active")
        .eq("is_active", true)
        .order("name")

      if (categoriesError) throw categoriesError

      // Format products with proper category handling
      const formattedProducts: Product[] = (productsData || []).map((product: any) => ({
        product_id: product.product_id,
        name: product.name,
        description: product.description,
        price: product.price,
        category_id: product.category_id,
        category: product.category ? {
          category_id: product.category.category_id,
          name: product.category.name,
          description: product.category.description,
          is_active: product.category.is_active,
        } : undefined,
        image_url: product.image_url,
        item_code: product.item_code,
        is_active: product.is_active,
        created_at: product.created_at,
        updated_at: product.updated_at,
      }))

      setProducts(formattedProducts)
      setCategories(categoriesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      Alert.alert("Error", "Failed to load menu data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category_id: "",
      image_url: "",
      item_code: "",
      is_active: true,
    })
    setNewCategoryName("")
    setEditingProduct(null)
  }

  // Open modal for adding new product
  const openAddModal = () => {
    resetForm()
    setModalVisible(true)
  }

  // Open modal for editing product
  const openEditModal = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      category_id: product.category_id?.toString() || "",
      image_url: product.image_url || "",
      item_code: product.item_code || "",
      is_active: product.is_active,
    })
    setNewCategoryName("")
    setEditingProduct(product)
    setModalVisible(true)
  }

  // Save product (add or update)
  const saveProduct = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Product name is required")
      return
    }

    const price = parseFloat(formData.price)
    if (isNaN(price) || price < 0) {
      Alert.alert("Error", "Please enter a valid price")
      return
    }

    // Resolve category: either use an existing one from the dropdown
    // or create a new category when newCategoryName is provided.
    let resolvedCategoryId: number | null = null

    const trimmedNewCategory = newCategoryName.trim()
    if (trimmedNewCategory) {
      try {
        const { data: existing, error: existingError } = await supabase
          .from("category")
          .select("category_id")
          .eq("name", trimmedNewCategory)
          .maybeSingle()

        if (existingError) {
          console.error("Error checking existing category:", existingError)
        }

        if (existing?.category_id) {
          resolvedCategoryId = existing.category_id
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("category")
            .insert({
              name: trimmedNewCategory,
              description: null,
              display_order: 0,
              is_active: true,
            })
            .select("category_id")
            .single()

          if (insertError) {
            console.error("Error creating new category:", insertError)
            Alert.alert("Error", "Failed to create new category")
            return
          }

          resolvedCategoryId = inserted?.category_id ?? null
        }
      } catch (catError) {
        console.error("Unexpected category creation error:", catError)
        Alert.alert("Error", "Failed to create new category")
        return
      }
    } else if (formData.category_id) {
      resolvedCategoryId = parseInt(formData.category_id, 10)
    }

    setSaving(true)
    try {
      if (editingProduct) {
        // Update existing product
        const updateData = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          price: price,
          category_id: resolvedCategoryId,
          image_url: formData.image_url.trim() || null,
          item_code: formData.item_code.trim() || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
          .from("product")
          .update(updateData)
          .eq("product_id", editingProduct.product_id)

        if (error) throw error

        Alert.alert("Success", "Product updated successfully")
      } else {
        // Add new product
        const productData = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          price: price,
          category_id: resolvedCategoryId,
          image_url: formData.image_url.trim() || null,
          item_code: formData.item_code.trim() || null,
          is_active: formData.is_active,
        }

        const { error } = await supabase
          .from("product")
          .insert(productData)

        if (error) throw error

        Alert.alert("Success", "Product added successfully")
      }

      setModalVisible(false)
      resetForm()
      fetchData()
    } catch (error: any) {
      console.error("Error saving product:", error)
      Alert.alert("Error", error.message || "Failed to save product. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Delete product
  const deleteProduct = async (product: Product) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("product")
                .delete()
                .eq("product_id", product.product_id)

              if (error) throw error

              Alert.alert("Success", "Product deleted successfully")
              fetchData()
            } catch (error) {
              console.error("Error deleting product:", error)
              Alert.alert("Error", "Failed to delete product. Please try again.")
            }
          },
        },
      ]
    )
  }

  // Toggle product active status
  const toggleProductStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("product")
        .update({
          is_active: !product.is_active,
          updated_at: new Date().toISOString()
        })
        .eq("product_id", product.product_id)

      if (error) throw error

      Alert.alert("Success", `Product ${!product.is_active ? "activated" : "deactivated"} successfully`)
      fetchData()
    } catch (error) {
      console.error("Error toggling product status:", error)
      Alert.alert("Error", "Failed to update product status. Please try again.")
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" || product.category?.name === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#92400E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Menu Management</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#92400E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search + Category Filters */}
        <View style={styles.searchAndFilters}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
            maxLength={100}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScrollOuter}
          >
            <TouchableOpacity
              style={[
                styles.categoryPill,
                selectedCategory === "All" && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory("All")}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === "All" && styles.categoryPillTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.category_id}
                style={[
                  styles.categoryPill,
                  selectedCategory === category.name && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(category.name)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategory === category.name && styles.categoryPillTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{products.length}</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{products.filter(p => p.is_active).length}</Text>
            <Text style={styles.statLabel}>Active Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{categories.length}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              ₱{products.reduce((sum, p) => sum + p.price, 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
        </View>

        <View style={styles.productsList}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No products found</Text>
              <TouchableOpacity style={styles.addFirstButton} onPress={openAddModal}>
                <Text style={styles.addFirstButtonText}>Add First Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredProducts.map((product) => (
              <View key={product.product_id} style={styles.productCard}>
                <View style={styles.productInfo}>
                  <View style={styles.productImage}>
                    {product.image_url ? (
                      <Image source={{ uri: product.image_url }} style={styles.image} />
                    ) : (
                      <Text style={styles.imagePlaceholder}>🍽️</Text>
                    )}
                  </View>
                  <View style={styles.productDetails}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productCategory}>
                      {product.category?.name || "Uncategorized"}
                    </Text>
                    {product.item_code && (
                      <Text style={styles.productCode}>Code: {product.item_code}</Text>
                    )}
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {product.description || "No description"}
                    </Text>
                  </View>
                </View>

                <View style={styles.productActions}>
                  <Text style={styles.productPrice}>₱{product.price.toFixed(2)}</Text>

                  <TouchableOpacity
                    style={[styles.statusButton, product.is_active ? styles.activeButton : styles.inactiveButton]}
                    onPress={() => toggleProductStatus(product)}
                  >
                    <Text style={[styles.statusButtonText, product.is_active ? styles.activeButtonText : styles.inactiveButtonText]}>
                      {product.is_active ? "Active" : "Inactive"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(product)}
                  >
                    <Ionicons name="pencil" size={16} color="#6B7280" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteProduct(product)}
                  >
                    <Ionicons name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter product name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  maxLength={120}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter product description"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Price *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={formData.price}
                  onChangeText={(text) => {
                    const sanitized = sanitizeMoneyInput(text)
                    setFormData({ ...formData, price: sanitized })
                  }}
                  keyboardType="decimal-pad"
                  maxLength={12}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[styles.categoryButton, !formData.category_id && styles.categoryButtonActive]}
                    onPress={() => setFormData({ ...formData, category_id: "" })}
                  >
                    <Text style={[styles.categoryButtonText, !formData.category_id && styles.categoryButtonTextActive]}>
                      No Category
                    </Text>
                  </TouchableOpacity>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.category_id}
                      style={[styles.categoryButton, formData.category_id === category.category_id.toString() && styles.categoryButtonActive]}
                      onPress={() => setFormData({ ...formData, category_id: category.category_id.toString() })}
                    >
                      <Text style={[styles.categoryButtonText, formData.category_id === category.category_id.toString() && styles.categoryButtonTextActive]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Or Add New Category</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new category name"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  maxLength={80}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Item Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter item code (optional)"
                  value={formData.item_code}
                  onChangeText={(text) => setFormData({ ...formData, item_code: text })}
                  autoCapitalize="characters"
                  maxLength={32}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Image URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter image URL (optional)"
                  value={formData.image_url}
                  onChangeText={(text) => setFormData({ ...formData, image_url: text })}
                  autoCapitalize="none"
                  maxLength={255}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={[styles.checkbox, formData.is_active && styles.checkboxChecked]}
                    onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  >
                    {formData.is_active && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Product Active</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.7 }]}
                onPress={saveProduct}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingProduct ? "Update Product" : "Add Product"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
  },
  addButton: {
    backgroundColor: "#F97316",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchAndFilters: {
    marginBottom: 20,
    gap: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  categoryScrollOuter: {
    paddingVertical: 2,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  productsList: {
    gap: 15,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 20,
  },
  addFirstButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  productInfo: {
    flexDirection: "row",
    marginBottom: 16,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  imagePlaceholder: {
    fontSize: 24,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: "#F97316",
    fontWeight: "500",
    marginBottom: 2,
  },
  productCode: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "monospace",
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  productActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#059669",
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeButton: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  inactiveButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EF4444",
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  activeButtonText: {
    color: "#FFFFFF",
  },
  inactiveButtonText: {
    color: "#EF4444",
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  categoryScroll: {
    flexDirection: "row",
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  categoryPillActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
  },
  categoryButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryButtonActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryButtonTextActive: {
    color: "#FFFFFF",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#374151",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#F97316",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})
