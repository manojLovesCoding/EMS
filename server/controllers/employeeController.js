import Employee from "../models/Employee.js";
import bcrypt from "bcrypt";
import User from "../models/User.js";

//GET employees
//GET /api/employees
export const getEmployees = async (req, res) => {
  try {
    const { department } = req.query;
    const where = {};

    if (department) where.department = department;

    const employees = (await Employee.find(where))
      .toSorted({ createdAt: -1 })
      .populate("userId", "email role")
      .lean();

    const result = employees.map((emp) => ({
      ...emp,
      id: emp._id.toString(),
      user: emp.userId
        ? { email: emp.userId.email, role: emp.userId.role }
        : null,
    }));
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch employees" });
  }
};

//create employee
//POST /api/employees
export const createEmployees = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      basicSalary,
      allowances,
      deductions,
      joinDate,
      password,
      role,
      bio,
    } = req.body;

    if (!email || !password || !firstName || !lastName)
      return res.status(400).json({ error: "Missing required fields" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashed,
      role: role || "EMPLOYEE",
    });

    const employee = await Employee.create({
      userId: user._id,
      firstName,
      lastName,
      email,
      phone,
      position,
      department: department || "Engineering",
      basicSalary: Number(basicSalary) || 0,
      allowances: Number(basicSalary) || 0,
      deductions: Number(basicSalary) || 0,
      joinDate: new Date(joinDate),
      bio: bio || "",
    });

    return res.status(201).json({ success: true, employee });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "email already exists" });
    }
    console.error("create employee error:", error);
    return res.status(500).json({ error: "Failed to create employee" });
  }
};

//update employee
//PUT /api/employees/:id
export const updateEmployees = async (req, res) => {};

//delete employee
//DELETE /api/employees/:id
export const deleteEmployees = async (req, res) => {};
