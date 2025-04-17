import mongoose from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";

const connection = mongoose.connection;
const AutoIncrement = AutoIncrementFactory(connection);

const ModeOfPaymentSchema = new mongoose.Schema(
  {
    modeOfPayment: { 
      type: String, 
      required: true,
      enum: ['gpay', 'razorpay', 'cash', 'bank_transfer', 'phonepe', 'upi', 'other'],
      default: 'razorpay'
    },
    displayName: {
      type: String,
      required: true
    },
    bookingId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Booking", 
      required: true 
    },
    details: { 
      type: mongoose.Schema.Types.Mixed 
    },
    isActive: {
      type: Boolean,
      default: true
    },
    processingFee: {
      type: Number,
      default: 0
    },
    minAmount: Number,
    maxAmount: Number,
    iconUrl: String,
    notes: String
  },
  { 
    timestamps: { createdAt: "createdAt" },
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const PaymentSchema = new mongoose.Schema(
  {
    modeOfPaymentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ModeOfPayment", 
      required: true 
    },
    bookingId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Booking", 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true,
      validate: {
        validator: function(value) {
          return value > 0;
        },
        message: 'Payment amount must be positive'
      }
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD']
    },
    paymentStatus: {
      type: String,
      enum: ["completed", "pending", "failed", "refunded", "processed"],
      default: "pending",
    },
    paymentType: {
      type: String,
      enum: ['deposit', 'installment', 'final', 'full'],
      default: 'full'
    },
    installmentNumber: { 
      type: Number,
      default: 0 
    },
    transactionDetails: { 
      type: Object 
    },
    isPartial: { 
      type: Boolean, 
      default: false 
    },
    customerRequest: { 
      type: String 
    },
    customerResponse: { 
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    payId: { 
      type: String, 
      required: true 
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    recordedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    completedAt: { 
      type: Date 
    },
    failedAt: { 
      type: Date 
    },
    refundedAt: { 
      type: Date 
    },
    notes: { 
      type: String 
    }
  },
  { 
    timestamps: { updatedAt: "updatedAt" },
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const RefundSchema = new mongoose.Schema(
  {
    paymentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Payment", 
      required: true 
    },
    amountRefunded: { 
      type: Number, 
      required: true 
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ["refunded", "pending", "failed"],
      default: "pending",
    },
    refundReason: String,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    refundedAt: { 
      type: Date 
    },
    transactionDetails: {
      type: Object
    },
    notes: String
  },
  { 
    timestamps: { createdAt: "createdAt" },
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Add auto-increment plugins if models don't exist
if (!mongoose.models.ModeOfPayment) {
  ModeOfPaymentSchema.plugin(AutoIncrement, {
    id: "mode_of_payment_seq",
    inc_field: "order",
    start_seq: 1000,
  });
}

if (!mongoose.models.Payment) {
  PaymentSchema.plugin(AutoIncrement, {
    id: "payment_seq",
    inc_field: "order",
    start_seq: 5000,
  });
}

// Add indexes
PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ payId: 1 });
PaymentSchema.index({ razorpayOrderId: 1 });
PaymentSchema.index({ razorpayPaymentId: 1 });
PaymentSchema.index({ paymentStatus: 1 });
PaymentSchema.index({ paymentType: 1 });

ModeOfPaymentSchema.index({ modeOfPayment: 1 });
ModeOfPaymentSchema.index({ bookingId: 1 });

RefundSchema.index({ paymentId: 1 });
RefundSchema.index({ status: 1 });

// Virtuals
PaymentSchema.virtual('amountInRupees').get(function() {
  return this.currency === 'INR' ? this.amount : null;
});

const ModeOfPayment = mongoose.models.ModeOfPayment || mongoose.model("ModeOfPayment", ModeOfPaymentSchema);
const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
const Refund = mongoose.models.Refund || mongoose.model("Refund", RefundSchema);

export { ModeOfPayment, Payment, Refund };