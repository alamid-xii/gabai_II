import bcrypt from "bcrypt";
import { User, sequelize } from "./models/userModel.js";

const DEFAULT_PASSWORD = "password";
const accounts = [
  {
    name: "Demo Student",
    email: "student@gmail.com",
    role: "student",
    department: null,
  },
  {
    name: "Demo Teacher",
    email: "teacher@gmail.com",
    role: "teacher",
    department: "Academic Affairs",
  },
  {
    name: "Demo Registrar",
    email: "registrar@gmail.com",
    role: "registrar",
    department: "Records Office",
  },
  {
    name: "Demo Admin",
    email: "admin@gmail.com",
    role: "admin",
    department: null,
  },
];

try {
  await sequelize.authenticate();
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const account of accounts) {
    const [user, created] = await User.findOrCreate({
      where: { email: account.email },
      defaults: {
        ...account,
        password,
        isActive: true,
        isVerified: true,
      },
    });

    if (!created) {
      await user.update({
        name: account.name,
        role: account.role,
        department: account.department,
        password,
        isActive: true,
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
      });
    }

    console.log(`${created ? "Created" : "Updated"} ${account.role} account: ${account.email}`);
  }
} catch (error) {
  console.error("User seeding failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
