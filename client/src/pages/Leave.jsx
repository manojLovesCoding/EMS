
import { useCallback, useEffect, useState } from "react";
import Loading from "../components/Loading";
import {
  PalmtreeIcon,
  PlusIcon,
  ThermometerIcon,
  UmbrellaIcon,
} from "lucide-react";
import LeaveHistory from "../components/Leave/LeaveHistory";
import ApplyLeaveModal from "../components/Leave/ApplyLeaveModal";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import toast from "react-hot-toast";

const Leave = () => {
  const { user } = useAuth();

  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const fetchLeaves = useCallback(async () => {
    try {
      const res = await api.get("/leave");

      setLeaves(res.data.data || []);
      setBalance(res.data.balance || null);
      setIsDeleted(Boolean(res.data.employee?.isDeleted));
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error.message ||
          "Failed to fetch leave applications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  if (loading) return <Loading />;

  const leaveStats = [
    {
      label: "Regular Leave",
      value: balance?.regular?.available ?? 0,
      description: "days available",
      icon: PalmtreeIcon,
    },
    {
      label: "Sick Leave",
      value: balance?.sick?.available ?? 0,
      description: "days available",
      icon: ThermometerIcon,
    },
    {
      label: "Regular Leave Used",
      value: balance?.regular?.used ?? 0,
      description: "days taken",
      icon: UmbrellaIcon,
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="page-title">Leave Management</h1>

          <p className="page-subtitle">
            {isAdmin
              ? "Manage leave applications"
              : "Your leave history and requests"}
          </p>
        </div>

        {!isAdmin && !isDeleted && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <PlusIcon className="w-4 h-4" />
            Apply for Leave
          </button>
        )}
      </div>

      {!isAdmin && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
            {leaveStats.map((stat) => (
              <div
                key={stat.label}
                className="card card-hover p-5 sm:p-6 flex items-center gap-4 relative overflow-hidden group"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-slate-500/70 group-hover:bg-indigo-500/70" />

                <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-indigo-50 transition-colors duration-200">
                  <stat.icon className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors duration-200" />
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    {stat.label}
                  </p>

                  <p className="text-2xl font-medium text-slate-900 tracking-tight">
                    {stat.value}
                    <span className="text-sm font-normal text-slate-400 ml-2">
                      {stat.description}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {balance?.leaveYear && (
            <p className="text-xs text-slate-400 mb-5">
              Leave year:{" "}
              {balance.leaveYear.start} to {balance.leaveYear.end}
            </p>
          )}
        </>
      )}

      <LeaveHistory
        leaves={leaves}
        isAdmin={isAdmin}
        onUpdate={fetchLeaves}
      />

      <ApplyLeaveModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchLeaves}
        balance={balance}
      />
    </div>
  );
};

export default Leave;
