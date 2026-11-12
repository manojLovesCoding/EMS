
import React, { useState } from "react";
import { format } from "date-fns";
import {
  Check,
  Loader2,
  X,
  Wallet,
  CalendarDays,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const getLeaveTypeLabel = (type) => {
  const labels = {
    REGULAR: "Regular Leave",
    SICK: "Sick Leave",
    CASUAL: "Regular Leave",
    ANNUAL: "Regular Leave",
  };

  return labels[type] || type;
};

const formatDate = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return format(parsedDate, "MMM dd, yyyy");
};

const formatDays = (value) => {
  return Number(value ?? 0);
};

const getStatusClasses = (status) => {
  switch (status) {
    case "APPROVED":
      return "badge-success";

    case "REJECTED":
      return "badge-danger";

    default:
      return "badge-warning";
  }
};

const LeaveHistory = ({
  leaves = [],
  isAdmin,
  onUpdate,
}) => {
  const [processing, setProcessing] = useState(null);

  const handleStatusUpdate = async (id, status) => {
    if (processing) return;

    setProcessing(id);

    try {
      await api.patch(`/leave/${id}`, { status });

      toast.success(
        status === "APPROVED"
          ? "Leave approved successfully."
          : "Leave rejected successfully.",
      );

      await onUpdate?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error.message ||
          "Failed to update leave status.",
      );
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-slate-500" />

          <h2 className="font-semibold text-slate-800">
            Leave History
          </h2>
        </div>

        <p className="text-xs text-slate-400 mt-1">
          {isAdmin
            ? "Review and manage employee leave applications."
            : "View your leave applications and paid/unpaid breakdown."}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="table-modern">
          <thead>
            <tr>
              {isAdmin && (
                <th className="px-6 py-4">Employee</th>
              )}

              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Dates</th>
              <th className="px-6 py-4">Days</th>
              <th className="px-6 py-4">Reason</th>
              <th className="px-6 py-4">Status</th>

              {isAdmin && (
                <th className="text-center px-6 py-4">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 5}
                  className="text-center py-12 text-slate-400"
                >
                  No leave applications found
                </td>
              </tr>
            ) : (
              leaves.map((leave) => {
                const id = leave._id || leave.id;

                const totalDays = formatDays(leave.totalDays);

const isApproved = leave.status === "APPROVED";
const isPending = leave.status === "PENDING";

const hasStoredBreakdown =
  Number(leave.paidDays || 0) > 0 ||
  Number(leave.unpaidDays || 0) > 0;

const paidDays = hasStoredBreakdown
  ? formatDays(leave.paidDays)
  : isApproved
    ? totalDays
    : 0;

const unpaidDays = hasStoredBreakdown
  ? formatDays(leave.unpaidDays)
  : 0;

const isRegularType = ["REGULAR", "CASUAL", "ANNUAL"].includes(
  leave.type,
);

                const isSameDate =
                  formatDate(leave.startDate) ===
                  formatDate(leave.endDate);

                return (
                  <React.Fragment key={id}>
                    <tr>
                      {/* Employee */}
                      {isAdmin && (
                        <td className="text-slate-900">
                          {leave.employee?.firstName || ""}{" "}
                          {leave.employee?.lastName || ""}
                        </td>
                      )}

                      {/* Leave type */}
                      <td>
                        <span className="badge bg-slate-100 text-slate-600">
                          {getLeaveTypeLabel(leave.type)}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(leave.startDate)}

                        {!isSameDate && (
                          <> - {formatDate(leave.endDate)}</>
                        )}
                      </td>

                      {/* Total requested days */}
                      <td className="text-slate-600 whitespace-nowrap">
                        {totalDays}{" "}
                        <span className="text-xs text-slate-400">
                          {totalDays === 1 ? "day" : "days"}
                        </span>
                      </td>

                      {/* Reason */}
                      <td
                        className="max-w-xs truncate text-slate-500"
                        title={leave.reason}
                      >
                        {leave.reason}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`badge ${getStatusClasses(
                            leave.status,
                          )}`}
                        >
                          {leave.status}
                        </span>
                      </td>

                      {/* Admin actions */}
                      {isAdmin && (
                        <td>
                          {isPending && (
                            <div className="flex justify-center gap-2">
                              <button
                                disabled={!!processing}
                                onClick={() =>
                                  handleStatusUpdate(
                                    id,
                                    "APPROVED",
                                  )
                                }
                                title="Approve leave"
                                className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                              >
                                {processing === id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                onClick={() =>
                                  handleStatusUpdate(
                                    id,
                                    "REJECTED",
                                  )
                                }
                                disabled={!!processing}
                                title="Reject leave"
                                className="p-1.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition-colors"
                              >
                                {processing === id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}

                          {!isPending && (
                            <p className="text-xs text-slate-400 text-center">
                              Processed
                            </p>
                          )}
                        </td>
                      )}
                    </tr>

                    {/* Paid / unpaid breakdown */}
                    {isApproved && (
                      <tr>
                        <td
                          colSpan={isAdmin ? 7 : 5}
                          className="px-6 py-3 bg-slate-50/70"
                        >
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                            <div className="flex items-center gap-2">
                              <Wallet className="w-4 h-4 text-slate-400" />

                              <span className="font-medium text-slate-600">
                                Leave allocation:
                              </span>
                            </div>

                            <span className="text-emerald-700">
                              Paid:{" "}
                              <strong>{paidDays} day(s)</strong>
                            </span>

                            <span className="text-rose-600">
                              Unpaid:{" "}
                              <strong>{unpaidDays} day(s)</strong>
                            </span>

                            {isRegularType && (
                              <span className="text-slate-500">
                                Regular paid: {formatDays(
                                  leave.paidRegularDays,
                                )}{" "}
                                | Unpaid: {formatDays(
                                  leave.unpaidRegularDays,
                                )}
                              </span>
                            )}

                            {leave.type === "SICK" && (
                              <span className="text-slate-500">
                                Sick paid: {formatDays(
                                  leave.paidSickDays,
                                )}{" "}
                                | Unpaid: {formatDays(
                                  leave.unpaidSickDays,
                                )}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Pending information */}
                    {isPending && (
                      <tr>
                        <td
                          colSpan={isAdmin ? 7 : 5}
                          className="px-6 py-2 bg-slate-50/50"
                        >
                          <p className="text-xs text-amber-600">
                            Paid/unpaid allocation will be calculated
                            after admin approval.
                          </p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveHistory;
