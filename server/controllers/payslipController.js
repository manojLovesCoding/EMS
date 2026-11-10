
import Employee from "../models/Employee.js";
import Payslip from "../models/Payslip.js";
import LeaveApplication from "../models/LeaveApplication.js";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const roundMoney = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const getMonthDateRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return { start, end };
};

// Monday to Saturday are working days.
// Sunday is excluded.
const getWorkingDaysInMonth = (month, year) => {
  const daysInMonth = new Date(
    Date.UTC(year, month, 0),
  ).getUTCDate();

  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(
      Date.UTC(year, month - 1, day),
    );

    if (date.getUTCDay() !== 0) {
      workingDays++;
    }
  }

  return workingDays;
};

// --------------------------------------------------
// POST /api/payslips
// Create payslip
// --------------------------------------------------

export const createPayslip = async (req, res) => {
  try {
    // Salary amounts are fetched from Employee.
    // Do not trust salary values sent by the frontend.
    const { employeeId, month, year } = req.body;

    const selectedMonth = Number(month);
    const selectedYear = Number(year);

    if (
      !employeeId ||
      !Number.isInteger(selectedMonth) ||
      selectedMonth < 1 ||
      selectedMonth > 12 ||
      !Number.isInteger(selectedYear) ||
      selectedYear < 2000
    ) {
      return res.status(400).json({
        error:
          "Please provide a valid employee, month and year.",
      });
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      isDeleted: false,
    });

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found.",
      });
    }

    const basicSalary = Number(employee.basicSalary || 0);
    const allowances = Number(employee.allowances || 0);
    const deductions = Number(employee.deductions || 0);

    if (
      !Number.isFinite(basicSalary) ||
      !Number.isFinite(allowances) ||
      !Number.isFinite(deductions) ||
      basicSalary < 0 ||
      allowances < 0 ||
      deductions < 0
    ) {
      return res.status(400).json({
        error: "Employee salary details are invalid.",
      });
    }

    // Prevent accidental duplicate payslip generation.
    const existingPayslip = await Payslip.findOne({
      employeeId: employee._id,
      month: selectedMonth,
      year: selectedYear,
    });

    if (existingPayslip) {
      return res.status(409).json({
        error:
          "A payslip already exists for this employee and month.",
      });
    }

    const { start, end } = getMonthDateRange(
      selectedMonth,
      selectedYear,
    );

    // Find approved leave applications containing
    // unpaid dates in the selected month.
    const approvedLeaves = await LeaveApplication.find({
      employeeId: employee._id,
      status: "APPROVED",
      "unpaidDateBreakdown.date": {
        $gte: start,
        $lt: end,
      },
    }).lean();

    let unpaidLeaveDays = 0;

    for (const leave of approvedLeaves) {
      for (const unpaidEntry of leave.unpaidDateBreakdown || []) {
        const unpaidDate = new Date(unpaidEntry.date);

        if (unpaidDate >= start && unpaidDate < end) {
          unpaidLeaveDays += Number(unpaidEntry.days || 0);
        }
      }
    }

    unpaidLeaveDays = roundMoney(unpaidLeaveDays);

    // Calculate actual Monday-Saturday working days
    // in the selected month.
    const workingDays = getWorkingDaysInMonth(
      selectedMonth,
      selectedYear,
    );

    const perDaySalary =
      workingDays > 0
        ? basicSalary / workingDays
        : 0;

    const unpaidLeaveDeduction = roundMoney(
      perDaySalary * unpaidLeaveDays,
    );

    // Net salary calculation.
    const netSalary = roundMoney(
      basicSalary +
        allowances -
        deductions -
        unpaidLeaveDeduction,
    );

    const payslip = await Payslip.create({
      employeeId: employee._id,
      month: selectedMonth,
      year: selectedYear,
      basicSalary,
      allowances,
      deductions,
      unpaidLeaveDays,
      unpaidLeaveDeduction,
      netSalary,
    });

    return res.status(201).json({
      success: true,
      data: payslip,
    });
  } catch (error) {
    console.error("Create payslip error:", error);

    return res.status(500).json({
      error: "Failed to generate payslip.",
    });
  }
};

// --------------------------------------------------
// GET /api/payslips
// Get payslips
// --------------------------------------------------

export const getPayslips = async (req, res) => {
  try {
    const session = req.session;

    if (!session?.userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const isAdmin = session.role === "ADMIN";

    if (isAdmin) {
      const payslips = await Payslip.find()
        .populate("employeeId")
        .sort({ createdAt: -1 });

      const data = payslips.map((p) => {
        const obj = p.toObject();

        return {
          ...obj,
          id: obj._id.toString(),
          employee: obj.employeeId || null,
          employeeId: obj.employeeId?._id?.toString() || null,
        };
      });

      return res.json({ data });
    }

    const employee = await Employee.findOne({
      userId: session.userId,
    });

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
      });
    }

    const payslips = await Payslip.find({
      employeeId: employee._id,
    }).sort({ createdAt: -1 });

    return res.json({ data: payslips });
  } catch (error) {
    console.error("GET /payslips error:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
};

// --------------------------------------------------
// GET /api/payslips/:id
// Get payslip by ID
// --------------------------------------------------

export const getPayslipById = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate("employeeId")
      .lean();

    if (!payslip) {
      return res.status(404).json({
        error: "Not found.",
      });
    }

    // Employees should only access their own payslips.
    if (req.session?.role !== "ADMIN") {
      const employee = await Employee.findOne({
        userId: req.session?.userId,
      }).lean();

      if (
        !employee ||
        employee._id.toString() !==
          payslip.employeeId?._id?.toString()
      ) {
        return res.status(403).json({
          error: "You are not allowed to view this payslip.",
        });
      }
    }

    const result = {
      ...payslip,
      id: payslip._id.toString(),
      employee: payslip.employeeId,
    };

    return res.json(result);
  } catch (error) {
    console.error("Get payslip error:", error);

    return res.status(500).json({
      error: "Failed to fetch payslip.",
    });
  }
};
