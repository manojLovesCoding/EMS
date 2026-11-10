
import mongoose from "mongoose";

const leaveApplicationSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    type: {
      type: String,
      enum: ["REGULAR", "SICK", "CASUAL", "ANNUAL"],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // Applies to the first working day.
    startDayType: {
      type: String,
      enum: ["FULL", "HALF"],
      default: "FULL",
    },

    // Applies to the last working day.
    endDayType: {
      type: String,
      enum: ["FULL", "HALF"],
      default: "FULL",
    },

    // Total requested working days.
    totalDays: {
      type: Number,
      required: true,
      min: 0,
    },

    // Total paid leave days.
    paidDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total unpaid leave days.
    unpaidDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Paid leave breakdown.
    paidRegularDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidSickDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Unpaid leave breakdown.
    unpaidRegularDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    unpaidSickDays: {
      type: Number,
      default: 0,
      min: 0,
    },


    // Exact unpaid dates, used for monthly payslip calculations.
    unpaidDateBreakdown: [
      {
        date: {
          type: Date,
          required: true,
        },
        days: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],


    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

const LeaveApplication =
  mongoose.models.LeaveApplication ||
  mongoose.model("LeaveApplication", leaveApplicationSchema);

export default LeaveApplication;
