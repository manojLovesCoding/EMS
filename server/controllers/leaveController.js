
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

const isWorkingDay = (date) => {
  // Sunday = 0. Monday to Saturday are working days.
  return date.getUTCDay() !== 0;
};

const isRegularLeave = (type) => {
  return ["REGULAR", "CASUAL", "ANNUAL"].includes(type);
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

  const isSingleDate =
    getDateKey(startDate) === getDateKey(endDate);

  let current = new Date(startDate);

  while (current <= endDate) {
    if (isWorkingDay(current)) {
      const currentKey = getDateKey(current);
      const startKey = getDateKey(startDate);
      const endKey = getDateKey(endDate);

      let dayValue = 1;

      if (isSingleDate) {
        dayValue = startDayType === "HALF" ? 0.5 : 1;
      } else {
        if (
          currentKey === startKey &&
          startDayType === "HALF"
        ) {
          dayValue -= 0.5;
        }

        if (
          currentKey === endKey &&
          endDayType === "HALF"
        ) {
          dayValue -= 0.5;
        }
      }

      totalDays += dayValue;
    }

    current = getNextDate(current);
  }

  return totalDays;
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
// Calculate approved leave usage per leave year
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

    const isSingleDate =
      getDateKey(startDate) === getDateKey(endDate);

    let current = new Date(startDate);

    while (current <= endDate) {
      if (isWorkingDay(current)) {
        const currentKey = getDateKey(current);

        let dayValue = 1;

        if (regular) {
          if (isSingleDate) {
            dayValue = startType === "HALF" ? 0.5 : 1;
          } else {
            if (
              currentKey === getDateKey(startDate) &&
              startType === "HALF"
            ) {
              dayValue -= 0.5;
            }

            if (
              currentKey === getDateKey(endDate) &&
              endType === "HALF"
            ) {
              dayValue -= 0.5;
            }
          }
        }

        const yearKey = getLeaveYearKey(current);

        if (!usage[yearKey]) {
          usage[yearKey] = {
            regular: 0,
            sick: 0,
          };
        }

        if (regular) {
          usage[yearKey].regular += dayValue;
        } else {
          usage[yearKey].sick += 1;
        }
      }

      current = getNextDate(current);
    }
  }

  return usage;
};

// --------------------------------------------------
// Get current employee balance
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
      available: Math.max(0, regularEarned - regularUsed),
    },

    sick: {
      allowance: 4,
      used: sickUsed,
      available: Math.max(0, 4 - sickUsed),
    },
  };
};

// --------------------------------------------------
// Validate balance before approval
// --------------------------------------------------

const validateLeaveBalance = async (leave) => {
  const approvedLeaves = await LeaveApplication.find({
    employeeId: leave.employeeId,
    status: "APPROVED",
    _id: { $ne: leave._id },
  }).lean();

  const usage = getApprovedUsageByYear(approvedLeaves);

  const startDate = new Date(leave.startDate);
  const endDate = new Date(leave.endDate);

  const requestedUsage = {};

  const regular = isRegularLeave(leave.type);
  const sick = leave.type === "SICK";

  if (!regular && !sick) {
    return "Invalid leave type.";
  }

  const startType = leave.startDayType || "FULL";
  const endType = leave.endDayType || "FULL";

  const isSingleDate =
    getDateKey(startDate) === getDateKey(endDate);

  let current = new Date(startDate);

  while (current <= endDate) {
    if (isWorkingDay(current)) {
      const currentKey = getDateKey(current);
      const yearKey = getLeaveYearKey(current);

      if (!requestedUsage[yearKey]) {
        requestedUsage[yearKey] = {
          regular: 0,
          sick: 0,
        };
      }

      let dayValue = 1;

      if (regular) {
        if (isSingleDate) {
          dayValue = startType === "HALF" ? 0.5 : 1;
        } else {
          if (
            currentKey === getDateKey(startDate) &&
            startType === "HALF"
          ) {
            dayValue -= 0.5;
          }

          if (
            currentKey === getDateKey(endDate) &&
            endType === "HALF"
          ) {
            dayValue -= 0.5;
          }
        }

        requestedUsage[yearKey].regular += dayValue;
      } else {
        requestedUsage[yearKey].sick += 1;
      }
    }

    current = getNextDate(current);
  }

  const now = new Date();

  for (const [yearKey, requested] of Object.entries(
    requestedUsage,
  )) {
    const leaveYearStart = parseDateOnly(yearKey);

    const usedRegular = usage[yearKey]?.regular || 0;
    const usedSick = usage[yearKey]?.sick || 0;

    if (regular) {
      const earned = getEarnedRegularLeave(
        leaveYearStart,
        now,
      );

      const available = Math.max(0, earned - usedRegular);

      if (requested.regular > available) {
        return `Insufficient regular leave balance. Available: ${available} day(s). Requested: ${requested.regular} day(s).`;
      }
    }

    if (sick) {
      const available = Math.max(0, 4 - usedSick);

      if (requested.sick > available) {
        return `Insufficient sick leave balance. Available: ${available} day(s). Requested: ${requested.sick} day(s).`;
      }
    }
  }

  return null;
};

// --------------------------------------------------
// POST /api/leave
// Create leave application
// --------------------------------------------------

export const createLeave = async (req, res) => {
  try {
    const session = req.session;

    const employee = await Employee.findOne({
      userId: session.userId,
    });

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found.",
      });
    }

    if (employee.isDeleted || employee.employmentStatus === "INACTIVE") {
      return res.status(403).json({
        error: "Your account is inactive. You cannot apply for leave.",
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

    if (!type || !startDate || !endDate || !reason?.trim()) {
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

    if (end < start) {
      return res.status(400).json({
        error: "End date cannot be before start date.",
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
        error: "The first day of a half-day request must be a working day.",
      });
    }

    if (
      lastDayType === "HALF" &&
      !isWorkingDay(end)
    ) {
      return res.status(400).json({
        error: "The last day of a half-day request must be a working day.",
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
        error: "The selected dates do not contain any working days.",
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
    const isAdmin = session.role === "ADMIN";

    if (isAdmin) {
      const { status } = req.query;

      const where = status ? { status } : {};

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

    const balance = await getEmployeeLeaveBalance(employee._id);

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
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        error: "Invalid leave status.",
      });
    }

    const leave = await LeaveApplication.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        error: "Leave application not found.",
      });
    }

    if (leave.status !== "PENDING") {
      return res.status(400).json({
        error: "This leave application has already been processed.",
      });
    }

    if (status === "APPROVED") {
      const employee = await Employee.findById(leave.employeeId);

      if (!employee || employee.isDeleted) {
        return res.status(400).json({
          error: "The employee account is unavailable.",
        });
      }

      const balanceError = await validateLeaveBalance(leave);

      if (balanceError) {
        return res.status(400).json({
          error: balanceError,
        });
      }
    }

    leave.status = status;
    await leave.save();

    return res.json({
      success: true,
      data: leave,
    });
  } catch (error) {
    console.error("Update leave status error:", error);

    return res.status(500).json({
      error: "Failed to update leave status.",
    });
  }
};
