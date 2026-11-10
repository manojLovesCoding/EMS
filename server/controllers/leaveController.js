
import { inngest } from "../inngest/index.js";
import Employee from "../models/Employee.js";
import LeaveApplication from "../models/LeaveApplication.js";

// --------------------------------------------------
// Date helpers
// --------------------------------------------------

const parseDateOnly = (value) => {
  if (typeof value !== "string") return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const getDateKey = (date) => date.toISOString().slice(0, 10);

const getNextDate = (date) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
};

// Sunday is excluded.
// Monday to Saturday are working days.
const isWorkingDay = (date) => date.getUTCDay() !== 0;

const isRegularLeave = (type) => {
  return ["REGULAR", "CASUAL", "ANNUAL"].includes(type);
};

const roundDays = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

// --------------------------------------------------
// Calculate the leave value for an individual date
// --------------------------------------------------

const getLeaveDayValue = (
  current,
  startDate,
  endDate,
  startDayType = "FULL",
  endDayType = "FULL",
) => {
  const currentKey = getDateKey(current);
  const startKey = getDateKey(startDate);
  const endKey = getDateKey(endDate);

  const isSingleDate = startKey === endKey;

  let dayValue = 1;

  if (isSingleDate) {
    return startDayType === "HALF" ? 0.5 : 1;
  }

  if (currentKey === startKey && startDayType === "HALF") {
    dayValue -= 0.5;
  }

  if (currentKey === endKey && endDayType === "HALF") {
    dayValue -= 0.5;
  }

  return dayValue;
};

// --------------------------------------------------
// Calculate leave duration
// --------------------------------------------------

const calculateLeaveDays = (
  startDate,
  endDate,
  startDayType = "FULL",
  endDayType = "FULL",
) => {
  let totalDays = 0;
  let current = new Date(startDate);

  while (current <= endDate) {
    if (isWorkingDay(current)) {
      totalDays += getLeaveDayValue(
        current,
        startDate,
        endDate,
        startDayType,
        endDayType,
      );
    }

    current = getNextDate(current);
  }

  return roundDays(totalDays);
};

// --------------------------------------------------
// Leave year helpers
// Leave year: May 1 to April 30
// --------------------------------------------------

const getLeaveYearStart = (date) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  const leaveYear = month >= 4 ? year : year - 1;

  return new Date(Date.UTC(leaveYear, 4, 1));
};

const getLeaveYearKey = (date) => {
  return getDateKey(getLeaveYearStart(date));
};

// --------------------------------------------------
// Monthly regular leave credits
// 0.5 day per month
// Maximum 6 days per leave year
// --------------------------------------------------

const getEarnedRegularLeave = (
  leaveYearStart,
  currentDate = new Date(),
) => {
  const nextLeaveYear = new Date(
    Date.UTC(
      leaveYearStart.getUTCFullYear() + 1,
      4,
      1,
    ),
  );

  if (currentDate < leaveYearStart) {
    return 0;
  }

  if (currentDate >= nextLeaveYear) {
    return 6;
  }

  const monthsElapsed =
    (currentDate.getUTCFullYear() -
      leaveYearStart.getUTCFullYear()) *
      12 +
    (currentDate.getUTCMonth() -
      leaveYearStart.getUTCMonth()) +
    1;

  return Math.min(monthsElapsed * 0.5, 6);
};

// --------------------------------------------------
// Calculate approved PAID leave usage per leave year
//
// Important:
// Only paid leave consumes the paid leave balance.
// Unpaid leave does not consume the balance.
//
// New records use unpaidDateBreakdown to calculate
// the paid portion of each approved leave date.
//
// Older records without unpaidDateBreakdown are
// treated as fully paid for backward compatibility.
// --------------------------------------------------

const getApprovedUsageByYear = (leaves) => {
  const usage = {};

  for (const leave of leaves) {
    if (leave.status !== "APPROVED") continue;

    const regular = isRegularLeave(leave.type);
    const sick = leave.type === "SICK";

    if (!regular && !sick) continue;

    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);

    const startType = leave.startDayType || "FULL";
    const endType = leave.endDayType || "FULL";

    const unpaidByDate = new Map();

    for (const entry of leave.unpaidDateBreakdown || []) {
      const key = getDateKey(new Date(entry.date));

      unpaidByDate.set(
        key,
        (unpaidByDate.get(key) || 0) + Number(entry.days || 0),
      );
    }

    const hasStoredBreakdown =
      Number(leave.paidDays || 0) > 0 ||
      Number(leave.unpaidDays || 0) > 0;

    let current = new Date(startDate);

    while (current <= endDate) {
      if (isWorkingDay(current)) {
        const dayValue = getLeaveDayValue(
          current,
          startDate,
          endDate,
          startType,
          endType,
        );

        const currentKey = getDateKey(current);

        // Old records without a stored breakdown are
        // treated as fully paid.
        const unpaid = hasStoredBreakdown
          ? Math.min(
              dayValue,
              unpaidByDate.get(currentKey) || 0,
            )
          : 0;

        const paid = roundDays(dayValue - unpaid);

        const yearKey = getLeaveYearKey(current);

        if (!usage[yearKey]) {
          usage[yearKey] = {
            regular: 0,
            sick: 0,
          };
        }

        if (regular) {
          usage[yearKey].regular += paid;
        } else {
          usage[yearKey].sick += paid;
        }
      }

      current = getNextDate(current);
    }
  }

  for (const year of Object.values(usage)) {
    year.regular = roundDays(year.regular);
    year.sick = roundDays(year.sick);
  }

  return usage;
};

// --------------------------------------------------
// Get current employee leave balance
// --------------------------------------------------

const getEmployeeLeaveBalance = async (employeeId) => {
  const now = new Date();

  const leaveYearStart = getLeaveYearStart(now);
  const yearKey = getDateKey(leaveYearStart);

  const approvedLeaves = await LeaveApplication.find({
    employeeId,
    status: "APPROVED",
  }).lean();

  const usage = getApprovedUsageByYear(approvedLeaves);

  const regularEarned = getEarnedRegularLeave(
    leaveYearStart,
    now,
  );

  const regularUsed = usage[yearKey]?.regular || 0;
  const sickUsed = usage[yearKey]?.sick || 0;

  return {
    leaveYear: {
      start: getDateKey(leaveYearStart),
      end: getDateKey(
        new Date(
          Date.UTC(
            leaveYearStart.getUTCFullYear() + 1,
            3,
            30,
          ),
        ),
      ),
    },

    regular: {
      earned: regularEarned,
      used: regularUsed,
      available: roundDays(
        Math.max(0, regularEarned - regularUsed),
      ),
    },

    sick: {
      allowance: 4,
      used: sickUsed,
      available: roundDays(
        Math.max(0, 4 - sickUsed),
      ),
    },
  };
};

// --------------------------------------------------
// Calculate paid and unpaid leave allocation
//
// Regular leave:
// 0.5 day per month, maximum 6 days per leave year.
//
// Sick leave:
// 4 days per leave year.
//
// Paid leave is allocated first.
// Remaining leave becomes unpaid.
// --------------------------------------------------

const calculateLeaveBreakdown = async (leave) => {
  const approvedLeaves = await LeaveApplication.find({
    employeeId: leave.employeeId,
    status: "APPROVED",
    _id: { $ne: leave._id },
  }).lean();

  const usage = getApprovedUsageByYear(approvedLeaves);

  const now = new Date();

  const regular = isRegularLeave(leave.type);
  const sick = leave.type === "SICK";

  if (!regular && !sick) {
    throw new Error("Invalid leave type.");
  }

  const startDate = new Date(leave.startDate);
  const endDate = new Date(leave.endDate);

  const startType = leave.startDayType || "FULL";
  const endType = leave.endDayType || "FULL";

  const breakdown = {
    paidDays: 0,
    unpaidDays: 0,

    paidRegularDays: 0,
    paidSickDays: 0,

    unpaidRegularDays: 0,
    unpaidSickDays: 0,

    unpaidDateBreakdown: [],
  };

  // Tracks paid leave allocated within this application.
  const allocatedByYear = {};

  let current = new Date(startDate);

  while (current <= endDate) {
    if (isWorkingDay(current)) {
      const dayValue = getLeaveDayValue(
        current,
        startDate,
        endDate,
        startType,
        endType,
      );

      const yearKey = getLeaveYearKey(current);

      if (!allocatedByYear[yearKey]) {
        allocatedByYear[yearKey] = {
          regular: 0,
          sick: 0,
        };
      }

      const existingUsage = usage[yearKey] || {
        regular: 0,
        sick: 0,
      };

      let available = 0;

      if (regular) {
        const leaveYearStart = parseDateOnly(yearKey);

        const earned = getEarnedRegularLeave(
          leaveYearStart,
          now,
        );

        available = Math.max(
          0,
          earned -
            existingUsage.regular -
            allocatedByYear[yearKey].regular,
        );
      } else {
        available = Math.max(
          0,
          4 -
            existingUsage.sick -
            allocatedByYear[yearKey].sick,
        );
      }

      // Allocate paid leave first.
      const paid = roundDays(
        Math.min(dayValue, available),
      );

      // Remaining portion becomes unpaid.
      const unpaid = roundDays(dayValue - paid);

      if (regular) {
        breakdown.paidRegularDays += paid;
        breakdown.unpaidRegularDays += unpaid;

        allocatedByYear[yearKey].regular += paid;
      } else {
        breakdown.paidSickDays += paid;
        breakdown.unpaidSickDays += unpaid;

        allocatedByYear[yearKey].sick += paid;
      }

      breakdown.paidDays += paid;
      breakdown.unpaidDays += unpaid;

      // Store the exact unpaid date and portion.
      if (unpaid > 0) {
        breakdown.unpaidDateBreakdown.push({
          date: new Date(current),
          days: unpaid,
        });
      }
    }

    current = getNextDate(current);
  }

  // Round numeric fields only.
  for (const key of Object.keys(breakdown)) {
    if (key !== "unpaidDateBreakdown") {
      breakdown[key] = roundDays(breakdown[key]);
    }
  }

  return breakdown;
};

// --------------------------------------------------
// POST /api/leave
// Create leave application
// --------------------------------------------------

export const createLeave = async (req, res) => {
  try {
    const session = req.session;

    if (!session?.userId) {
      return res.status(401).json({
        error: "Unauthorized.",
      });
    }

    const employee = await Employee.findOne({
      userId: session.userId,
    });

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found.",
      });
    }

    if (
      employee.isDeleted ||
      employee.employmentStatus === "INACTIVE"
    ) {
      return res.status(403).json({
        error:
          "Your account is inactive. You cannot apply for leave.",
      });
    }

    const {
      type,
      startDate,
      endDate,
      startDayType,
      endDayType,
      reason,
    } = req.body;

    if (
      !type ||
      !startDate ||
      !endDate ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        error: "Please fill in all required fields.",
      });
    }

    if (!["REGULAR", "SICK"].includes(type)) {
      return res.status(400).json({
        error: "Invalid leave type.",
      });
    }

    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (!start || !end) {
      return res.status(400).json({
        error: "Invalid leave dates.",
      });
    }

    if (end < start) {
      return res.status(400).json({
        error: "End date cannot be before start date.",
      });
    }

    const today = new Date();

    const todayDate = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      ),
    );

    if (start <= todayDate || end <= todayDate) {
      return res.status(400).json({
        error: "Leave dates must be in the future.",
      });
    }

    const firstDayType =
      type === "REGULAR" && startDayType === "HALF"
        ? "HALF"
        : "FULL";

    const lastDayType =
      type === "REGULAR" && endDayType === "HALF"
        ? "HALF"
        : "FULL";

    if (
      firstDayType === "HALF" &&
      !isWorkingDay(start)
    ) {
      return res.status(400).json({
        error:
          "The first day of a half-day request must be a working day.",
      });
    }

    if (
      lastDayType === "HALF" &&
      !isWorkingDay(end)
    ) {
      return res.status(400).json({
        error:
          "The last day of a half-day request must be a working day.",
      });
    }

    const totalDays = calculateLeaveDays(
      start,
      end,
      firstDayType,
      lastDayType,
    );

    if (totalDays <= 0) {
      return res.status(400).json({
        error:
          "The selected dates do not contain any working days.",
      });
    }

    const leave = await LeaveApplication.create({
      employeeId: employee._id,
      type,
      startDate: start,
      endDate: end,
      startDayType: firstDayType,
      endDayType: lastDayType,
      totalDays,
      reason: reason.trim(),
      status: "PENDING",
    });

    await inngest.send({
      name: "leave/pending",
      data: {
        leaveApplicationId: leave._id,
      },
    });

    return res.status(201).json({
      success: true,
      data: leave,
    });
  } catch (error) {
    console.error("Create leave error:", error);

    return res.status(500).json({
      error: "Failed to create leave application.",
    });
  }
};

// --------------------------------------------------
// GET /api/leave
// Get leave applications
// --------------------------------------------------

export const getLeaves = async (req, res) => {
  try {
    const session = req.session;

    if (!session?.userId) {
      return res.status(401).json({
        error: "Unauthorized.",
      });
    }

    const isAdmin = session.role === "ADMIN";

    if (isAdmin) {
      const { status } = req.query;

      const where = {};

      if (status) {
        if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
          return res.status(400).json({
            error: "Invalid leave status filter.",
          });
        }

        where.status = status;
      }

      const leaves = await LeaveApplication.find(where)
        .populate("employeeId")
        .sort({ createdAt: -1 });

      const data = leaves.map((leave) => {
        const obj = leave.toObject();

        return {
          ...obj,
          id: obj._id.toString(),
          employee: obj.employeeId,
          employeeId: obj.employeeId?._id?.toString(),
        };
      });

      return res.json({ data });
    }

    const employee = await Employee.findOne({
      userId: session.userId,
    }).lean();

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found.",
      });
    }

    const leaves = await LeaveApplication.find({
      employeeId: employee._id,
    }).sort({ createdAt: -1 });

    const balance = await getEmployeeLeaveBalance(
      employee._id,
    );

    return res.json({
      data: leaves,
      employee: {
        ...employee,
        id: employee._id.toString(),
      },
      balance,
    });
  } catch (error) {
    console.error("Get leaves error:", error);

    return res.status(500).json({
      error: "Failed to fetch leave applications.",
    });
  }
};

// --------------------------------------------------
// PATCH /api/leave/:id
// Admin approves or rejects leave
// --------------------------------------------------

export const updateLeaveStatus = async (req, res) => {
  try {
    if (req.session?.role !== "ADMIN") {
      return res.status(403).json({
        error: "Only admins can update leave status.",
      });
    }

    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        error: "Invalid leave status.",
      });
    }

    const leave = await LeaveApplication.findOne({
      _id: req.params.id,
      status: "PENDING",
    });

    if (!leave) {
      return res.status(404).json({
        error:
          "Leave application not found or already processed.",
      });
    }

    let updateFields = { status };

    if (status === "APPROVED") {
      const employee = await Employee.findById(
        leave.employeeId,
      );

      if (
        !employee ||
        employee.isDeleted ||
        employee.employmentStatus === "INACTIVE"
      ) {
        return res.status(400).json({
          error:
            "Cannot approve leave for an inactive employee.",
        });
      }

      const breakdown = await calculateLeaveBreakdown(leave);

      updateFields = {
        status: "APPROVED",
        ...breakdown,
      };
    }

    // Prevent two admins from processing the same
    // pending leave application.
    const updatedLeave = await LeaveApplication.findOneAndUpdate(
      {
        _id: leave._id,
        status: "PENDING",
      },
      {
        $set: updateFields,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedLeave) {
      return res.status(409).json({
        error:
          "This leave application has already been processed.",
      });
    }

    return res.json({
      success: true,
      message:
        status === "APPROVED"
          ? "Leave approved successfully."
          : "Leave rejected successfully.",
      data: updatedLeave,
    });
  } catch (error) {
    console.error("Update leave status error:", error);

    return res.status(500).json({
      error: "Failed to update leave status.",
    });
  }
};
