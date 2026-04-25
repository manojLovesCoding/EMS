import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginLanding from "./pages/LoginLanding";
import Dashboard from "./pages/Dashboard";
import Layout from "./pages/Layout";
import Employees from "./pages/Employees";
import Attendence from "./pages/Attendence";
import Payslips from "./pages/Payslips";
import PrintPayslip from "./pages/PrintPayslip";
import LoginForm from "./components/LoginForm";
import Leave from "./pages/Leave";
import Settings from "./pages/Settings";

const App = () => {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<LoginLanding />} />
        <Route path="/login/admin" element={<LoginForm role="admin" title="Admin Portal" subtitle="Sign in to manage the organization" />} />
        <Route path="/login/employee" element={<LoginForm role="employee" title="Employee Portal" subtitle="Sign in to access your account" />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/attendence" element={<Attendence />} />
          <Route path="/payslips" element={<Payslips />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/print/payslip/:id" element={<PrintPayslip />} />
        <Route path="/*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
};

export default App;
