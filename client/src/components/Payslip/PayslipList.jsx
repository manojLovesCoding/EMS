
import { format } from "date-fns";
import { Download } from "lucide-react";
import React from "react";

const PayslipList = ({ payslips = [], isAdmin }) => {
  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-modern">
          <thead>
            <tr>
              {isAdmin && <th>Employee</th>}
              <th>Period</th>
              <th>Basic Salary</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Unpaid Leave</th>
              <th>Leave Deduction</th>
              <th>Net Salary</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {payslips.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 9 : 8}
                  className="text-center py-12 text-slate-400"
                >
                  No payslips found
                </td>
              </tr>
            ) : (
              payslips.map((payslip) => (
                <tr key={payslip._id || payslip.id}>
                  {/* Employee */}
                  {isAdmin && (
                    <td className="text-slate-900 font-medium">
                      {payslip.employee?.firstName}{" "}
                      {payslip.employee?.lastName}
                    </td>
                  )}

                  {/* Period */}
                  <td className="text-slate-500 whitespace-nowrap">
                    {format(
                      new Date(payslip.year, payslip.month - 1),
                      "MMMM yyyy",
                    )}
                  </td>

                  {/* Basic Salary */}
                  <td className="text-slate-500 whitespace-nowrap">
                    {formatCurrency(payslip.basicSalary)}
                  </td>

                  {/* Allowances */}
                  <td className="text-slate-500 whitespace-nowrap">
                    {formatCurrency(payslip.allowances)}
                  </td>

                  {/* Regular Deductions */}
                  <td className="text-slate-500 whitespace-nowrap">
                    {formatCurrency(payslip.deductions)}
                  </td>

                  {/* Unpaid Leave Days */}
                  <td className="text-slate-500 whitespace-nowrap">
                    {Number(payslip.unpaidLeaveDays || 0)} days
                  </td>

                  {/* Unpaid Leave Deduction */}
                  <td className="text-red-600 whitespace-nowrap">
                    {formatCurrency(payslip.unpaidLeaveDeduction)}
                  </td>

                  {/* Net Salary */}
                  <td className="font-semibold text-slate-900 whitespace-nowrap">
                    {formatCurrency(payslip.netSalary)}
                  </td>

                  {/* Download */}
                  <td className="text-center">
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          `/print/payslip/${payslip._id || payslip.id}`,
                          "_blank",
                        )
                      }
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors ring-1 ring-blue-600/10"
                      title="Download Payslip"
                    >
                      <Download className="w-3 h-3 mr-1.5" />
                      Download
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayslipList;
