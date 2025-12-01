import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, ScrollView, ActivityIndicator } from "react-native"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "../../utils/supabaseClient"

interface PayPalPaymentProps {
  visible: boolean
  onClose: () => void
  totalAmount: number
  orderId?: number
  onPaymentComplete: (transactionId: string) => void
}

export default function PayPalPayment({
  visible,
  onClose,
  totalAmount,
  orderId,
  onPaymentComplete,
}: PayPalPaymentProps) {
  const [step, setStep] = useState<"login" | "confirm" | "success">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [transactionId, setTransactionId] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [isProcessing, setIsProcessing] = useState(false)

  const handleLogin = () => {
    const newErrors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      newErrors.email = "Email or mobile is required"
    }
    if (!password.trim()) {
      newErrors.password = "Password is required"
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) {
      setStep("confirm")
    }
  }

  const handlePay = async () => {
    setIsProcessing(true)

    // Generate transaction ID
    const txId = `PP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    setTransactionId(txId)

    try {
      // Record payment to database
      if (orderId) {
        const { error } = await supabase.from("payment").insert({
          order_id: orderId,
          payment_date: new Date().toISOString(),
          amount_paid: totalAmount,
          payment_method: "PayPal",
          payment_status: "Completed",
          transaction_id: txId,
          email: email,
        })

        if (error) {
          console.error("Error recording payment:", error)
        }
      }

      setStep("success")
      setShowSuccess(true)

      // Auto-close success modal after 2 seconds and complete payment
      setTimeout(() => {
        setShowSuccess(false)
        setIsProcessing(false)
        onPaymentComplete(txId)
        // Don't call onClose() here - let the main component handle modal closing
      }, 2000)
    } catch (error) {
      console.error("Payment error:", error)
      setIsProcessing(false)
    }
  }

  return (
    <>
      {/* Step 1: Login */}
      <Modal visible={visible && step === "login" && !showSuccess} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>PayPal Login</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.logoContainer}>
                <View style={styles.paypalLogo}>
                  <Text style={styles.paypalText}>PayPal</Text>
                </View>
              </View>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email or Mobile</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="Enter email or mobile"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text)
                      setErrors({ ...errors, email: "" })
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    placeholder="Enter password"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text)
                      setErrors({ ...errors, password: "" })
                    }}
                    secureTextEntry
                  />
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>

                <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                  <Text style={styles.loginButtonText}>Log In</Text>
                </TouchableOpacity>

                <View style={styles.linksContainer}>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>Forgot password?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Step 2: Payment Confirmation */}
      <Modal visible={visible && step === "confirm" && !showSuccess} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Payment Confirmation</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.confirmContent}>
                <View style={styles.paypalIconContainer}>
                  <View style={styles.paypalIcon}>
                    <Text style={styles.paypalIconText}>P</Text>
                  </View>
                </View>

                <View style={styles.paymentInfo}>
                  <Text style={styles.emailText}>{email}</Text>
                  <Text style={styles.amountLabel}>Amount</Text>
                  <Text style={styles.amount}>${totalAmount.toFixed(2)}</Text>
                </View>

                <TouchableOpacity style={styles.payButton} onPress={handlePay} disabled={isProcessing}>
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.payButtonText}>Pay ${totalAmount.toFixed(2)}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Step 3: Success */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successText}>Transaction ID: {transactionId}</Text>
            <Text style={styles.successSubtext}>Recording to database...</Text>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 500,
    maxHeight: "90%",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  paypalLogo: {
    backgroundColor: "#0070BA",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  paypalText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  input: {
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: "#0070BA",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  linksContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  linkText: {
    color: "#0070BA",
    fontSize: 14,
  },
  confirmContent: {
    alignItems: "center",
    gap: 24,
  },
  paypalIconContainer: {
    marginBottom: 16,
  },
  paypalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0070BA",
    justifyContent: "center",
    alignItems: "center",
  },
  paypalIconText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "bold",
  },
  paymentInfo: {
    alignItems: "center",
    gap: 8,
  },
  emailText: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  amount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
  },
  payButton: {
    backgroundColor: "#0070BA",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginTop: 16,
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  successModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    width: "90%",
    maxWidth: 400,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  successSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
  },
})

