import React, { useCallback, useEffect, useState } from "react";
import { dummyAttendanceData } from "../assets/assets";
import Loading from "../components/Loading";
import CheckInButton from "../components/Attendance/CheckInButton";
import AttendanceStats from "../components/Attendance/AttendanceStats";
import AttendanceHistory from "../components/Attendance/AttendanceHistory";
import api from "../api/axios";
import toast from "react-hot-toast";

const Attendance = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleted, setDeleted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/attendance");
      const json = res.data;
      setHistory(json.data || []);
      if (json.employee?.isDeleted) setDeleted(true);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch attendance data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <Loading />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayRecord = history.find(
    (r) => new Date(r.date).toDateString() === today.toDateString(),
  );

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Attendance</h1>
        <p className="page-subtitle">
          Track your work hours and daily check-ins
        </p>
      </div>

      {/* Deleted State */}
      {isDeleted ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center shadow-sm">
          <p className="text-rose-600 font-medium">
            You can no longer clock in or out because your employee records have
            been marked as deleted.
          </p>
        </div>
      ) : (
        <div>
          <CheckInButton todayRecord={todayRecord} onAction={fetchData} />
        </div>
      )}

      {/* Stats */}
      <AttendanceStats history={history} />

      {/* History */}
      <AttendanceHistory history={history} />
    </div>
  );
};

export default Attendance;
