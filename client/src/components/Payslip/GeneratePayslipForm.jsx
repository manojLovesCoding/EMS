
import { Loader2, Plus, X } from "lucide-react";
import React, { useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const GeneratePayslipForm = ({ employees = [], onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentDate = new Date();

  const [formData, setFormData] = useState({
    employeeId: "",
    month: String(currentDate.getMonth() + 1),
    year: String(currentDate.getFullYear()),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClose = () => {
    if (loading) return;

    setIsOpen(false);

    setFormData({
      employeeId: "",
      month: String(currentDate.getMonth() + 1),
      year: String(currentDate.getFullYear()),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeId) {
      toast.error("Please select an employee.");
      return;
    }

    if (
      !formData.month ||
      !formData.year ||
      Number(formData.year) < 2000
    ) {
      toast.error("Please select a valid month and year.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        employeeId: formData.employeeId,
        month: Number(formData.month),
        year: Number(formData.year),
      };

      await api.post("/payslips", payload);

      toast.success("Payslip generated successfully.");

      setIsOpen(false);

      setFormData({
        employeeId: "",
        month: String(currentDate.getMonth() + 1),
        year: String(currentDate.getFullYear()),
      });

      onSuccess?.();
    } catch (error) {
      console.error("Generate payslip error:", error);

      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to generate payslip.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Generate Payslip
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg w-full p-6 animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            Generate Monthly Payslip
          </h3>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Employee */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Employee
            </label>

            <select
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              required
              className="w-full"
            >
              <option value="">Select Employee</option>

              {employees.map((employee) => (
                <option
                  key={employee.id || employee._id}
                  value={employee.id || employee._id}
                >
                  {employee.firstName} {employee.lastName} -{" "}
                  {employee.position}
                </option>
              ))}
            </select>

            {employees.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                No employees available.
              </p>
            )}
          </div>

          {/* Select Month and Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Month
              </label>

              <select
                name="month"
                value={formData.month}
                onChange={handleChange}
                required
                className="w-full"
              >
                {Array.from(
                  { length: 12 },
                  (_, i) => i + 1,
                ).map((month) => (
                  <option value={month} key={month}>
                    {new Date(2000, month - 1).toLocaleString(
                      "en-US",
                      { month: "long" },
                    )}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Year
              </label>

              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min="2000"
                max="9999"
                required
                className="w-full"
              />
            </div>
          </div>

          {/* Salary Information */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-1">
              Automatic Salary Calculation
            </p>

            <p className="text-xs text-blue-700 leading-relaxed">
              Basic salary, allowances, and regular deductions
              will be fetched automatically from the employee
              record. Approved unpaid leave will be deducted
              according to the month's working days, excluding
              Sundays.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleClose}
              type="button"
              disabled={loading}
              className="btn-secondary disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary flex items-center"
              disabled={loading || employees.length === 0}
            >
              {loading && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}

              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeneratePayslipForm;
