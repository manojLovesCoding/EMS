
import React, { useState } from "react";
import { format } from "date-fns";
import { Check, Loader2, X } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const getLeaveTypeLabel = (type) => {
  const labels = {
    REGULAR: "Regular Paid",
    SICK: "Sick Leave",
    CASUAL: "Regular Paid",
    ANNUAL: "Regular Paid",
  };

  return labels[type] || type;
};

const formatDate = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return format(parsedDate, "MMM dd, yyyy");
};

const LeaveHistory = ({ leaves = [], isAdmin, onUpdate }) => {
  const [processing, setProcessing] = useState(null);

  const handleStatusUpdate = async (id, status) => {
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

                return (
                  <tr key={id}>
                    {isAdmin && (
                      <td className="text-slate-900">
                        {leave.employee?.firstName || ""}{" "}
                        {leave.employee?.lastName || ""}
                      </td>
                    )}

                    <td>
                      <span className="badge bg-slate-100 text-slate-600">
                        {getLeaveTypeLabel(leave.type)}
                      </span>
                    </td>

                    <td className="text-xs text-slate-500">
                      {formatDate(leave.startDate)}
                      {leave.startDate !== leave.endDate && (
                        <> - {formatDate(leave.endDate)}</>
                      )}
                    </td>

                    <td className="text-slate-600">
                      {Number(leave.totalDays ?? 0)}{" "}
                      <span className="text-xs text-slate-400">
                        {Number(leave.totalDays ?? 0) === 1
                          ? "day"
                          : "days"}
                      </span>
                    </td>

                    <td
                      className="max-w-xs truncate text-slate-500"
                      title={leave.reason}
                    >
                      {leave.reason}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          leave.status === "APPROVED"
                            ? "badge-success"
                            : leave.status === "REJECTED"
                              ? "badge-danger"
                              : "badge-warning"
                        }`}
                      >
                        {leave.status}
                      </span>
                    </td>

                    {isAdmin && (
                      <td>
                        {leave.status === "PENDING" && (
                          <div className="flex justify-center gap-2">
                            <button
                              disabled={!!processing}
                              onClick={() =>
                                handleStatusUpdate(id, "APPROVED")
                              }
                              title="Approve leave"
                              className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            >
                              {processing === id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              onClick={() =>
                                handleStatusUpdate(id, "REJECTED")
                              }
                              disabled={!!processing}
                              title="Reject leave"
                              className="p-1.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            >
                              {processing === id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
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
