import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { supabase } from "../../utils/supabaseClient"

interface StaffUser {
  id: number
  username: string
  full_name?: string
  email?: string
  role: "admin" | "cashier"
  is_active: boolean
  created_at: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    password: "",
    email: "",
    role: "cashier" as "admin" | "cashier",
    is_active: true,
  })
  const [saving, setSaving] = useState(false)

  // Fetch all staff users
  const fetchUsers = async () => {
    setLoading(true)
    try {
      // Fetch admins
      const { data: admins, error: adminError } = await supabase
        .from("admin")
        .select("admin_id, username, full_name, email, is_active, created_at")
        .order("created_at", { ascending: false })

      if (adminError) throw adminError

      // Fetch cashiers
      const { data: cashiers, error: cashierError } = await supabase
        .from("cashier")
        .select("cashier_id, username, full_name, email, is_active, created_at")
        .order("created_at", { ascending: false })

      if (cashierError) throw cashierError

      // Combine and format users
      const formattedAdmins: StaffUser[] = (admins || [])
        // Hide the seeded System Administrator account from the UI
        .filter((admin: any) => admin.username !== "admin")
        .map((admin: any) => ({
          id: admin.admin_id,
          username: admin.username,
          full_name: admin.full_name,
          email: admin.email,
          role: "admin" as const,
          is_active: admin.is_active,
          created_at: admin.created_at,
        }))

      const formattedCashiers: StaffUser[] = (cashiers || []).map(cashier => ({
        id: cashier.cashier_id,
        username: cashier.username,
        full_name: cashier.full_name,
        email: cashier.email,
        role: "cashier" as const,
        is_active: cashier.is_active,
        created_at: cashier.created_at,
      }))

      setUsers([...formattedAdmins, ...formattedCashiers])
    } catch (error) {
      console.error("Error fetching users:", error)
      Alert.alert("Error", "Failed to load users. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Reset form
  const resetForm = () => {
    setFormData({
      username: "",
      full_name: "",
      password: "",
      email: "",
      role: "cashier",
      is_active: true,
    })
    setEditingUser(null)
  }

  // Open modal for adding new user
  const openAddModal = () => {
    resetForm()
    setModalVisible(true)
  }

  // Open modal for editing user
  const openEditModal = (user: StaffUser) => {
    setFormData({
      username: user.username,
      full_name: user.full_name || "",
      password: "", // Don't show existing password
      email: user.email || "",
      role: user.role,
      is_active: user.is_active,
    })
    setEditingUser(user)
    setModalVisible(true)
  }

  // Save user (add or update)
  const saveUser = async () => {
    if (!formData.username.trim()) {
      Alert.alert("Error", "Username is required")
      return
    }

    if (!editingUser && !formData.password.trim()) {
      Alert.alert("Error", "Password is required for new users")
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        // Update existing user
        const tableName = editingUser.role === "admin" ? "admin" : "cashier"
        const updateData: any = {
          username: formData.username.trim(),
          full_name: formData.full_name.trim() || null,
          email: formData.email.trim() || null,
          is_active: formData.is_active,
        }

        // Only update password if provided
        if (formData.password.trim()) {
          updateData.password_hash = formData.password // Note: In production, hash the password
        }

        const { error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq(editingUser.role === "admin" ? "admin_id" : "cashier_id", editingUser.id)

        if (error) throw error

        // If role changed, we need to move the user to the other table
        if (editingUser.role !== formData.role) {
          // Delete from old table
          await supabase
            .from(tableName)
            .delete()
            .eq(editingUser.role === "admin" ? "admin_id" : "cashier_id", editingUser.id)

          // Insert into new table
          const newTableName = formData.role === "admin" ? "admin" : "cashier"
          const newData: any = {
            username: formData.username.trim(),
            full_name: formData.full_name.trim() || null,
            password_hash: formData.password.trim() || editingUser.username, // Use username as fallback
            email: formData.email.trim() || null,
            is_active: formData.is_active,
          }

          const { error: insertError } = await supabase
            .from(newTableName)
            .insert(newData)

          if (insertError) throw insertError
        }

        Alert.alert("Success", "User updated successfully")
      } else {
        // Add new user
        const tableName = formData.role === "admin" ? "admin" : "cashier"
        const userData = {
          username: formData.username.trim(),
          full_name: formData.full_name.trim() || null,
          password_hash: formData.password, // Note: In production, hash the password
          email: formData.email.trim() || null,
          is_active: formData.is_active,
        }

        const { error } = await supabase
          .from(tableName)
          .insert(userData)

        if (error) throw error

        Alert.alert("Success", "User added successfully")
      }

      setModalVisible(false)
      resetForm()
      fetchUsers()
    } catch (error: any) {
      console.error("Error saving user:", error)
      Alert.alert("Error", error.message || "Failed to save user. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Delete user
  const deleteUser = async (user: StaffUser) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${user.username}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const tableName = user.role === "admin" ? "admin" : "cashier"
              const { error } = await supabase
                .from(tableName)
                .delete()
                .eq(user.role === "admin" ? "admin_id" : "cashier_id", user.id)

              if (error) throw error

              Alert.alert("Success", "User deleted successfully")
              fetchUsers()
            } catch (error) {
              console.error("Error deleting user:", error)
              Alert.alert("Error", "Failed to delete user. Please try again.")
            }
          },
        },
      ]
    )
  }

  // Toggle user active status
  const toggleUserStatus = async (user: StaffUser) => {
    try {
      const tableName = user.role === "admin" ? "admin" : "cashier"
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !user.is_active })
        .eq(user.role === "admin" ? "admin_id" : "cashier_id", user.id)

      if (error) throw error

      Alert.alert("Success", `User ${!user.is_active ? "activated" : "deactivated"} successfully`)
      fetchUsers()
    } catch (error) {
      console.error("Error toggling user status:", error)
      Alert.alert("Error", "Failed to update user status. Please try again.")
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#92400E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading users...</Text>
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
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.filter(u => u.role === "admin").length}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.filter(u => u.role === "cashier").length}</Text>
            <Text style={styles.statLabel}>Cashiers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.filter(u => u.is_active).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        <View style={styles.usersList}>
          {users.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No users found</Text>
              <TouchableOpacity style={styles.addFirstButton} onPress={openAddModal}>
                <Text style={styles.addFirstButtonText}>Add First User</Text>
              </TouchableOpacity>
            </View>
          ) : (
            users.map((user) => (
              <View key={`${user.role}-${user.id}`} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <Ionicons
                      name={user.role === "admin" ? "shield-checkmark" : "person"}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {user.full_name || user.username}
                    </Text>
                    <Text style={styles.userUsername}>@{user.username}</Text>
                    <Text style={styles.userRole}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Text>
                    {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
                  </View>
                </View>

                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[styles.statusButton, user.is_active ? styles.activeButton : styles.inactiveButton]}
                    onPress={() => toggleUserStatus(user)}
                  >
                    <Text style={[styles.statusButtonText, user.is_active ? styles.activeButtonText : styles.inactiveButtonText]}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(user)}
                  >
                    <Ionicons name="pencil" size={16} color="#6B7280" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteUser(user)}
                  >
                    <Ionicons name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit User Modal */}
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
                {editingUser ? "Edit User" : "Add New User"}
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
                <Text style={styles.label}>Username *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  autoCapitalize="none"
                  maxLength={50}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  value={formData.full_name}
                  onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                  autoCapitalize="words"
                  maxLength={100}
                />
              </View>

              {!editingUser && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    secureTextEntry
                  maxLength={50}
                  />
                </View>
              )}

              {editingUser && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>New Password (leave empty to keep current)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    secureTextEntry
                  maxLength={50}
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={100}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Role</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[styles.roleButton, formData.role === "cashier" && styles.roleButtonActive]}
                    onPress={() => setFormData({ ...formData, role: "cashier" })}
                  >
                    <Ionicons name="person" size={20} color={formData.role === "cashier" ? "#FFFFFF" : "#92400E"} />
                    <Text style={[styles.roleButtonText, formData.role === "cashier" && styles.roleButtonTextActive]}>
                      Cashier
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleButton, formData.role === "admin" && styles.roleButtonActive]}
                    onPress={() => setFormData({ ...formData, role: "admin" })}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={20}
                      color={formData.role === "admin" ? "#FFFFFF" : "#92400E"}
                    />
                    <Text style={[styles.roleButtonText, formData.role === "admin" && styles.roleButtonTextActive]}>
                      Admin
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={[styles.checkbox, formData.is_active && styles.checkboxChecked]}
                    onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  >
                    {formData.is_active && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Account Active</Text>
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
                onPress={saveUser}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingUser ? "Update User" : "Add User"}
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
  usersList: {
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
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F97316",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 2,
    fontFamily: "monospace",
  },
  userRole: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  userActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    maxHeight: 400,
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
  roleButtons: {
    flexDirection: "row",
    gap: 10,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  roleButtonActive: {
    backgroundColor: "#1F2937",
    borderColor: "#1F2937",
  },
  roleButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
  },
  roleButtonTextActive: {
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
