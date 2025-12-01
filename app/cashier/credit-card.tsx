import { useState, useRef } from "react"
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, ScrollView, ActivityIndicator } from "react-native"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import FlippingCard from "../../components/FlippingCard"
import { supabase } from "../../utils/supabaseClient"

interface CreditCardPaymentProps {
  visible: boolean
  onClose: () => void
  totalAmount: number
  orderId?: number
  onPaymentComplete: (transactionId: string) => void
}

export default function CreditCardPayment({
  visible,
  onClose,
  totalAmount,
  orderId,
  onPaymentComplete,
}: CreditCardPaymentProps) {
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardName, setCardName] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [transactionId, setTransactionId] = useState("")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isFlipped, setIsFlipped] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const formatCardNumber = (text: string) => {
    const digits = text.replace(/\s/g, "").slice(0, 16)
    const groups = digits.match(/.{1,4}/g) || []
    return groups.join(" ")
  }

  const formatExpiry = (text: string) => {
    const digits = text.replace(/\//g, "").slice(0, 4)
    if (digits.length >= 2) {
      return digits.slice(0, 2) + "/" + digits.slice(2)
    }
    return digits
  }

  const handleCardNumberChange = (text: string) => {
    setCardNumber(formatCardNumber(text))
    setErrors({ ...errors, cardNumber: "" })
  }

  const handleExpiryChange = (text: string) => {
    setExpiry(formatExpiry(text))
    setErrors({ ...errors, expiry: "" })
  }

  const handleCvvChange = (text: string) => {
    setCvv(text.slice(0, 3))
    setErrors({ ...errors, cvv: "" })
  }

  const handleCardNameChange = (text: string) => {
    setCardName(text.toUpperCase())
    setErrors({ ...errors, cardName: "" })
  }

  const handleCvvFocus = () => {
    setIsFlipped(true)
  }

  const handleCvvBlur = () => {
    setIsFlipped(false)
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      newErrors.cardNumber = "Card number must be 16 digits"
    }
    if (expiry.length !== 5) {
      newErrors.expiry = "Expiry must be MM/YY"
    }
    if (cvv.length !== 3) {
      newErrors.cvv = "CVV must be 3 digits"
    }
    if (!cardName.trim()) {
      newErrors.cardName = "Cardholder name is required"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePay = async () => {
    if (!validateForm()) {
      return
    }

    setIsProcessing(true)

    try {
      // Validate card details (simulate API call)
      const cardDigits = cardNumber.replace(/\s/g, "")
      const isValidCard = cardDigits.length === 16 && !isNaN(parseInt(cardDigits))
      const isValidCVV = cvv.length === 3 && !isNaN(parseInt(cvv))
      const isValidExpiry = expiry.length === 5 && expiry.includes("/")
      const isValidName = cardName.trim().length > 0

      if (!isValidCard || !isValidCVV || !isValidExpiry || !isValidName) {
        setErrors({
          cardNumber: !isValidCard ? "Invalid card number" : "",
          expiry: !isValidExpiry ? "Invalid expiry date" : "",
          cvv: !isValidCVV ? "Invalid CVV" : "",
          cardName: !isValidName ? "Invalid cardholder name" : "",
        })
        setIsProcessing(false)
        return
      }

      // Generate transaction ID
      const txId = `CC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      setTransactionId(txId)

      // Show success immediately
      setShowSuccess(true)

      // Record payment in background (API call handled by processOrderWithPayment, NOT here)
      // Removed: payment DB insert from modal

      setTimeout(() => {
        setShowSuccess(false)
        setIsProcessing(false)
        onPaymentComplete(txId)
      }, 2000)
    } catch (error) {
      console.error("Payment error:", error)
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Modal visible={visible && !showSuccess} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Credit Card Payment</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <FlippingCard
                cardNumber={cardNumber}
                cardName={cardName}
                expiry={expiry}
                cvv={cvv}
                isFlipped={isFlipped}
                onCvvFocus={handleCvvFocus}
                onCvvBlur={handleCvvBlur}
              />

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Card Number</Text>
                  <TextInput
                    style={[styles.input, errors.cardNumber && styles.inputError]}
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                  {errors.cardNumber ? <Text style={styles.errorText}>{errors.cardNumber}</Text> : null}
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Expiry</Text>
                    <TextInput
                      style={[styles.input, errors.expiry && styles.inputError]}
                      placeholder="MM/YY"
                      value={expiry}
                      onChangeText={handleExpiryChange}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                    {errors.expiry ? <Text style={styles.errorText}>{errors.expiry}</Text> : null}
                  </View>

                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput
                      style={[styles.input, errors.cvv && styles.inputError]}
                      placeholder="123"
                      value={cvv}
                      onChangeText={handleCvvChange}
                      onFocus={handleCvvFocus}
                      onBlur={handleCvvBlur}
                      keyboardType="number-pad"
                      maxLength={3}
                      secureTextEntry
                    />
                    {errors.cvv ? <Text style={styles.errorText}>{errors.cvv}</Text> : null}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Cardholder Name</Text>
                  <TextInput
                    style={[styles.input, errors.cardName && styles.inputError]}
                    placeholder="JOHN DOE"
                    value={cardName}
                    onChangeText={handleCardNameChange}
                    autoCapitalize="characters"
                  />
                  {errors.cardName ? <Text style={styles.errorText}>{errors.cardName}</Text> : null}
                </View>

                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>Amount to Pay</Text>
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

      {/* Success Modal */}
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  amountContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
  },
  payButton: {
    backgroundColor: "#1054CF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
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

