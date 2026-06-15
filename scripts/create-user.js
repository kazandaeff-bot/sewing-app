const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash("123456", 10);
  const emp = await prisma.employee.create({
    data: {
      name: "Admin",
      code: "admin",
      username: "admin",
      password: hash,
      role: "supervisor",
    },
  });
  console.log("User created:", emp.username);
}
main().catch((e) => console.error(e));
