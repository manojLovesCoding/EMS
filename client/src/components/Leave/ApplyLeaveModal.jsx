
import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  FileText,
  Loader2,
  Send,
  X,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Check Sunday without UTC timezone conversion.
const isSunday = (dateString) => {
  if (!dateString) return false;

  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).getDay() === 0;
};

const ApplyLeaveModal = ({
  open,
  onClose,
  onSuccess,
  balance,
}) => {
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState("REGULAR");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDayType, setStartDayType] = useState("FULL");
  const [endDayType, setEndDayType] = useState("FULL");

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const minDate = getLocalDateString(tomorrow);

  const isSingleDate = startDate && startDate === endDate;

  const firstDayIsSunday = isSunday(startDate);
  const lastDayIsSunday = isSunday(endDate);

  useEffect(() => {
    if (open) {
      setType("REGULAR");
      setStartDate("");
      setEndDate("");
      setStartDayType("FULL");
      setEndDayType("FULL");
    }
  }, [open]);

  // Change leave type.
  const handleTypeChange = (value) => {
    setType(value);
    setStartDayType("FULL");
    setEndDayType("FULL");
  };

  // Change first date.
  const handleStartDateChange = (value) => {
    setStartDate(value);

    if (endDate && value > endDate) {
      setEndDate(value);
    }

    if (isSunday(value)) {
      setStartDayType("FULL");
    }
  };

  // Change last date.
  const handleEndDateChange = (value) => {
    setEndDate(value);

    if (isSunday(value)) {
      setEndDayType("FULL");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error("Please select the leave dates.");
      return;
    }

    if (endDate < startDate) {
      toast.error("End date cannot be before start date.");
      return;
    }

    const reason = e.currentTarget.reason.value.trim();

    if (!reason) {
      toast.error("Please provide a reason for leave.");
      return;
    }

    if (
      type === "REGULAR" &&
      startDayType === "HALF" &&
      firstDayIsSunday
    ) {
      toast.error("The first day of a half-day request must be a working day.");
      return;
    }

    if (
      type === "REGULAR" &&
      !isSingleDate &&
      endDayType === "HALF" &&
      lastDayIsSunday
    ) {
      toast.error("The last day of a half-day request must be a working day.");
      return;
    }

    const data = {
      type,
      startDate,
      endDate,

      startDayType:
        type === "REGULAR" ? startDayType : "FULL",

      endDayType:
        type === "REGULAR" && !isSingleDate
          ? endDayType
          : "FULL",

      reason,
    };

    setLoading(true);

    try {
      await api.post("/leave", data);

      toast.success("Leave application submitted.");

      await onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error.message ||
          "Failed to submit leave application.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Apply for leave
            </h2>

            <p className="text-sm text-slate-400 mt-0.5">
              Submit your leave request for approval
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Leave type */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Leave Type
            </label>

            <select
              name="type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              required
              disabled={loading}
              className="w-full"
            >
              <option value="REGULAR">Regular Paid Leave</option>
              <option value="SICK">Sick Leave</option>
            </select>

            {type === "REGULAR" && balance?.regular && (
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  Available regular leave:{" "}
                  <strong>{balance.regular.available} day(s)</strong>
                </p>

                <p>
                  Earned: {balance.regular.earned} day(s) | Used:{" "}
                  {balance.regular.used} day(s)
                </p>
              </div>
            )}

            {type === "SICK" && balance?.sick && (
              <p className="text-xs text-slate-500 mt-2">
                Available sick leave:{" "}
                <strong>{balance.sick.available} day(s)</strong>
                {" "}out of {balance.sick.allowance} days.
              </p>
            )}

            <p className="text-xs text-slate-400 mt-2">
              You can apply even if your paid leave balance is insufficient.
              Any excess leave may be allocated as unpaid after approval.
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              Duration
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs text-slate-400 mb-1">
                  From
                </span>

                <input
                  type="date"
                  name="startDate"
                  required
                  min={minDate}
                  value={startDate}
                  disabled={loading}
                  onChange={(e) =>
                    handleStartDateChange(e.target.value)
                  }
                  className="w-full"
                />
              </div>

              <div>
                <span className="block text-xs text-slate-400 mb-1">
                  To
                </span>

                <input
                  type="date"
                  name="endDate"
                  required
                  min={startDate || minDate}
                  value={endDate}
                  disabled={loading}
                  onChange={(e) =>
                    handleEndDateChange(e.target.value)
                  }
                  className="w-full"
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Working days are Monday to Saturday. Sundays are excluded.
            </p>
          </div>

          {/* Regular leave half-day options */}
          {type === "REGULAR" && startDate && endDate && (
            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  First day ({startDate})
                </p>

                <select
                  name="startDayType"
                  value={startDayType}
                  disabled={loading || firstDayIsSunday}
                  onChange={(e) =>
                    setStartDayType(e.target.value)
                  }
                  className="w-full"
                >
                  <option value="FULL">Full day</option>
                  <option value="HALF" disabled={firstDayIsSunday}>
                    Half day
                  </option>
                </select>

                {firstDayIsSunday && (
                  <p className="text-xs text-amber-600 mt-1">
                    Sunday is not a working day. Half-day leave is unavailable.
                  </p>
                )}
              </div>

              {!isSingleDate && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Last day ({endDate})
                  </p>

                  <select
                    name="endDayType"
                    value={endDayType}
                    disabled={loading || lastDayIsSunday}
                    onChange={(e) =>
                      setEndDayType(e.target.value)
                    }
                    className="w-full"
                  >
                    <option value="FULL">Full day</option>
                    <option value="HALF" disabled={lastDayIsSunday}>
                      Half day
                    </option>
                  </select>

                  {lastDayIsSunday && (
                    <p className="text-xs text-amber-600 mt-1">
                      Sunday is not a working day. Half-day leave is unavailable.
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-500">
                You can request half-day leave on the first day,
                last day, or both days. Two half-days count as one
                full leave day.
              </p>
            </div>
          )}

          {/* Sick leave information */}
          {type === "SICK" && (
            <p className="text-xs text-slate-500">
              Sick leave is counted in full working days and uses
              your separate annual allowance of 4 days.
            </p>
          )}

          {/* Reason */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Reason
            </label>

            <textarea
              name="reason"
              required
              rows={3}
              maxLength={500}
              disabled={loading}
              className="resize-none w-full"
              placeholder="Briefly describe why you need this leave..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              type="button"
              disabled={loading}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>

            <button
              disabled={loading}
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}

              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyLeaveModal;
