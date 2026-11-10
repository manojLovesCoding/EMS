import mongoose from "mongoose";

const payslipSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    basicSalary: {
      type: Number,
      required: true,
    },
    allowances: {
      type: Number,
      default: 0,
    },
    // Existing regular deductions.
    deductions: {
      type: Number,
      default: 0,
    },
    // Unpaid leave details for this payslip month.
    unpaidLeaveDays: {
      type: Number,
      default: 0,
    },
    unpaidLeaveDeduction: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

const Payslip =
  mongoose.models.Payslip || mongoose.model("Payslip", payslipSchema);

export default Payslip;
