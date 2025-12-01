import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from "react-native"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

interface PaymentData {
  amountReceived: number;
  change: number;
}

interface CashPaymentProps {
  visible: boolean;
  onClose: () => void;
  totalAmount: number;
  onPaymentComplete: (data: PaymentData) => void;
}

export default function CashPayment({ visible, onClose, totalAmount, onPaymentComplete }: CashPaymentProps) {
  const [amountReceived, setAmountReceived] = useState("")
  const [error, setError] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const change = parseFloat(amountReceived) - totalAmount

  // Clear input and focus when modal opens
  useEffect(() => {
    if (visible) {
      setAmountReceived("")
      setError("")
      setIsProcessing(false)
    }
  }, [visible])

  const handlePay = async () => {
    const received = parseFloat(amountReceived)
    if (!amountReceived || isNaN(received) || received <= 0) {
      setError("Please enter a valid amount")
      return
    }
    if (received < totalAmount) {
      setError("Amount received is less than total amount")
      return
    }
    
    setIsProcessing(true)
    setError("")
    
    // Small delay to show loading state
    setTimeout(() => {
      onPaymentComplete({
        amountReceived: received,
        change: change
      })
      setIsProcessing(false)
    }, 500)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Cash Payment</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₱{totalAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount Received</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder="0.00"
                value={amountReceived}
                onChangeText={(text) => {
                  setAmountReceived(text)
                  setError("")
                }}
                keyboardType="decimal-pad"
                autoFocus
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            {amountReceived && !isNaN(parseFloat(amountReceived)) && parseFloat(amountReceived) >= totalAmount && (
              <View style={styles.changeContainer}>
                <Text style={styles.changeLabel}>Change</Text>
                <Text style={styles.changeAmount}>₱{change.toFixed(2)}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.payButton} onPress={handlePay} disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.payButtonText}>PAY ₱{totalAmount.toFixed(2)}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    gap: 24,
  },
  amountContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  input: {
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: "600",
    color: "#1F2937",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 4,
  },
  changeContainer: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  changeLabel: {
    fontSize: 14,
    color: "#059669",
    marginBottom: 8,
  },
  changeAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#059669",
  },
  payButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
})

