
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { Download } from "lucide-react";
import toast from "react-hot-toast";

import Loading from "../components/Loading";
import api from "../api/axios";

const PrintPayslip = () => {
  const { id } = useParams();

  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayslip = async () => {
      try {
        const res = await api.get(`/payslips/${id}`);

        // Supports either a direct payslip object or { payslip: ... }
        setPayslip(res.data?.payslip || res.data);
      } catch (error) {
        console.error("Fetch payslip error:", error);

        toast.error(
          error.response?.data?.error ||
            error.response?.data?.message ||
            "Failed to load payslip.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPayslip();
  }, [id]);

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (loading) return <Loading />;

  if (!payslip) {
    return (
      <p className="text-center py-12 text-slate-400">
        Payslip not found
      </p>
    );
  }

  const employee = payslip.employeeId || payslip.employee || {};

  const period = format(
    new Date(payslip.year, payslip.month - 1),
    "MMMM yyyy",
  );

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white animate-fade-in print:max-w-none print:p-0">
      {/* Header */}
      <div className="text-center border-b border-slate-200 pb-6 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          PAYSLIP
        </h1>

        <p className="text-slate-500 text-sm mt-1">
          {period}
        </p>
      </div>

      {/* Employee Information */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Employee Name
          </p>

          <p className="font-semibold text-slate-900">
            {employee.firstName} {employee.lastName}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Position
          </p>

          <p className="font-semibold text-slate-900">
            {employee.position || "-"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Email
          </p>

          <p className="font-semibold text-slate-900">
            {employee.email || "-"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Pay Period
          </p>

          <p className="font-semibold text-slate-900">
            {period}
          </p>
        </div>
      </div>

      {/* Salary Breakdown */}
      <div className="rounded-xl border border-slate-200 overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left py-3 px-4 text-xs text-slate-500 uppercase tracking-wider">
                Description
              </th>

              <th className="text-right py-3 px-4 text-xs text-slate-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Basic Salary */}
            <tr className="border-t border-slate-100">
              <td className="py-3 px-4 text-slate-700">
                Basic Salary
              </td>

              <td className="text-right py-3 px-4 text-slate-900 font-medium">
                {formatCurrency(payslip.basicSalary)}
              </td>
            </tr>

            {/* Allowances */}
            <tr className="border-t border-slate-100">
              <td className="py-3 px-4 text-slate-700">
                Allowances
              </td>

              <td className="text-right py-3 px-4 text-green-600 font-medium">
                +{formatCurrency(payslip.allowances)}
              </td>
            </tr>

            {/* Regular Deductions */}
            <tr className="border-t border-slate-100">
              <td className="py-3 px-4 text-slate-700">
                Regular Deductions
              </td>

              <td className="text-right py-3 px-4 text-red-600 font-medium">
                -{formatCurrency(payslip.deductions)}
              </td>
            </tr>

            {/* Unpaid Leave Days */}
            <tr className="border-t border-slate-100">
              <td className="py-3 px-4 text-slate-700">
                Unpaid Leave
                <span className="block text-xs text-slate-400 mt-1">
                  {Number(payslip.unpaidLeaveDays || 0)} days
                </span>
              </td>

              <td className="text-right py-3 px-4 text-red-600 font-medium">
                -{formatCurrency(payslip.unpaidLeaveDeduction)}
              </td>
            </tr>

            {/* Net Salary */}
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="py-4 px-4 font-bold text-slate-900">
                Net Salary
              </td>

              <td className="text-right py-4 px-4 text-slate-900 font-bold text-base">
                {formatCurrency(payslip.netSalary)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Calculation Note */}
      <div className="bg-slate-50 rounded-lg p-4 mb-8">
        <p className="text-xs text-slate-500 leading-relaxed">
          Unpaid leave deduction is calculated using the
          employee's basic salary divided by the number of
          working days in the month. Sundays are excluded
          from the working-day calculation.
        </p>
      </div>

      {/* Print Button */}
      <div className="text-center">
        <button
          type="button"
          className="btn-primary print:hidden inline-flex items-center gap-2"
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4" />
          Print / Download Payslip
        </button>
      </div>
    </div>
  );
};

export default PrintPayslip;
