
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import connectDB from "../config/db.js";

import User from "../models/User.js";
import Employee from "../models/Employee.js";
import LeaveApplication from "../models/LeaveApplication.js";
import Payslip from "../models/Payslip.js";

// Test employee credentials
const TEST_EMAIL = "test.employee@example.com";
const TEST_PASSWORD = "Test@12345";

// Payslip period
const MONTH = 7;
const YEAR = 2026;

const BASIC_SALARY = 18750;
const ALLOWANCES = 0;
const DEDUCTIONS = 0;
const UNPAID_LEAVE_DAYS = 2;

const roundMoney = (amount) =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

// Count working days, excluding Sundays
const getWorkingDaysInMonth = (year, month) => {
  const daysInMonth = new Date(
    Date.UTC(year, month, 0),
  ).getUTCDate();

  

  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCDay() !== 0) {
      workingDays++;
    }
  }

  return workingDays;
};

const seedPayslipTest = async () => {
  try {
    await connectDB();

    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB connection was not established.");
    }

    console.log("Starting payslip test seed...");

    // 1. Create or reuse test user
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    const user = await User.findOneAndUpdate(
      { email: TEST_EMAIL },
      {
        $setOnInsert: {
          email: TEST_EMAIL,
          password: hashedPassword,
          role: "EMPLOYEE",
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    if (user.role !== "EMPLOYEE") {
      throw new Error(
        "The test email already belongs to a non-employee user.",
      );
    }

    console.log("Test user ready:", user.email);

    // 2. Create or update employee
    const employee = await Employee.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          firstName: "Test",
          lastName: "Employee",
          email: TEST_EMAIL,
          phone: "9876543210",
          position: "Software Developer",
          basicSalary: BASIC_SALARY,
          allowances: ALLOWANCES,
          deductions: DEDUCTIONS,
          employmentStatus: "ACTIVE",
          joinDate: new Date("2025-01-01T00:00:00.000Z"),
          isDeleted: false,
          bio: "Test employee for payslip calculation",
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    console.log("Test employee ready:", employee._id);

    // 3. Create approved unpaid leave
    const leaveStartDate = new Date("2026-07-06T00:00:00.000Z");
    const leaveEndDate = new Date("2026-07-07T00:00:00.000Z");

    const unpaidDateBreakdown = [
      {
        date: new Date("2026-07-06T00:00:00.000Z"),
        days: 1,
      },
      {
        date: new Date("2026-07-07T00:00:00.000Z"),
        days: 1,
      },
    ];

    const leave = await LeaveApplication.findOneAndUpdate(
      {
        employeeId: employee._id,
        type: "REGULAR",
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: "Test unpaid leave for July payslip",
      },
      {
        $set: {
          employeeId: employee._id,
          type: "REGULAR",
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          startDayType: "FULL",
          endDayType: "FULL",
          totalDays: 2,
          paidDays: 0,
          unpaidDays: 2,
          paidRegularDays: 0,
          paidSickDays: 0,
          unpaidRegularDays: 2,
          unpaidSickDays: 0,
          unpaidDateBreakdown,
          reason: "Test unpaid leave for July payslip",
          status: "APPROVED",
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    console.log("Approved unpaid leave ready:", leave._id);

    // 4. Calculate July salary
    const workingDays = getWorkingDaysInMonth(YEAR, MONTH);

    const dailySalary = BASIC_SALARY / workingDays;

    const unpaidLeaveDeduction = roundMoney(
      dailySalary * UNPAID_LEAVE_DAYS,
    );

    const netSalary = roundMoney(
      BASIC_SALARY +
        ALLOWANCES -
        DEDUCTIONS -
        unpaidLeaveDeduction,
    );

    // 5. Create or update July payslip
    const payslip = await Payslip.findOneAndUpdate(
      {
        employeeId: employee._id,
        month: MONTH,
        year: YEAR,
      },
      {
        $set: {
          employeeId: employee._id,
          month: MONTH,
          year: YEAR,
          basicSalary: BASIC_SALARY,
          allowances: ALLOWANCES,
          deductions: DEDUCTIONS,
          unpaidLeaveDays: UNPAID_LEAVE_DAYS,
          unpaidLeaveDeduction,
          netSalary,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    console.log("\n========== TEST PAYSLIP ==========");
    console.log("Employee:", employee.firstName, employee.lastName);
    console.log("Period: July 2026");
    console.log("Basic Salary: ₹", BASIC_SALARY);
    console.log("Allowances: ₹", ALLOWANCES);
    console.log("Regular Deductions: ₹", DEDUCTIONS);
    console.log("Working Days:", workingDays);
    console.log("Unpaid Leave Days:", UNPAID_LEAVE_DAYS);
    console.log("Daily Salary: ₹", roundMoney(dailySalary));
    console.log("Unpaid Leave Deduction: ₹", unpaidLeaveDeduction);
    console.log("Net Salary: ₹", netSalary);
    console.log("Payslip ID:", payslip._id);
    console.log("==================================");

    console.log("\nTest seed completed successfully.");
    console.log("Login email:", TEST_EMAIL);
    console.log("Login password:", TEST_PASSWORD);
  } catch (error) {
    console.error("Seed error:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

seedPayslipTest();
