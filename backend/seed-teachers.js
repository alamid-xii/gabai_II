import bcrypt from "bcrypt";
import { User, sequelize } from "./models/userModel.js";
import { isValidPassword, normalizeAccountEmail } from "./services/accountValidation.js";

const teacherAccounts = [
  { name: "Elsa M. Castillo", email: "e.castillo@emc.edu.ph", password: "Emc@C9rL35!c" },
  { name: "Jomari M. Javier", email: "j.javier@emc.edu.ph", password: "Emc@J4mT81!b" },
  { name: "Sunshine Jane C. Ferrera", email: "sj.ferrera@emc.edu.ph", password: "Emc@F6wD28!k" },
  { name: "May I. Dulce", email: "m.dulce@emc.edu.ph", password: "Emc@D7pL52!m" },
  { name: "Jean Jean M. Soledad", email: "j.soledad@emc.edu.ph", password: "Emc@S9mL35!q" },
  { name: "Kriz Kimberly Lee M. Montante", email: "k.montante@emc.edu.ph", password: "Emc@M7pL62!j" },
  { name: "Crystal F. Galin", email: "c.galin@emc.edu.ph", password: "Emc@G5yR41!h" },
  { name: "Jared C. Ramat", email: "j.ramat@emc.edu.ph", password: "Emc@R5kN83!q" },
  { name: "Rachelle Joy O. Inocencio", email: "rj.inocencio@emc.edu.ph", password: "Emc@I2pT76!v" },
  { name: "John Christian S. Saro", email: "jc.saro@emc.edu.ph", password: "Emc@J8bN53!r" },
  { name: "Kevin M. Villarin", email: "k.villarin@emc.edu.ph", password: "Emc@V2nP74!z" },
  { name: "Renier F. Gadon", email: "r.gadon@emc.edu.ph", password: "Emc@G8rT42!p" },
  { name: "Mert Joy M. Ricamara", email: "mj.ricamara@emc.edu.ph", password: "Emc@R5nP83!q" },
  { name: "Maricel H. Nicolas", email: "m.nicolas@emc.edu.ph", password: "Emc@N4tR83!q" },
  { name: "Gechiela Gintis B. Delos Reyes", email: "gl.delosreyes@emc.edu.ph", password: "Emc@D7mP26!x" },
  { name: "Jack Denniel F. Fernandez", email: "jd.fernandez@emc.edu.ph", password: "Emc@F8nL35!r" },
  { name: "Vincent G. Gerance", email: "v.gerance@emc.edu.ph", password: "Emc@G4wK82!s" },
  { name: "Jemina Carayag", email: "j.carayag@emc.edu.ph", password: "Emc@C5mR94!h" },
  { name: "Joan V. Cuasay", email: "j.cuasay@emc.edu.ph", password: "Emc@C7qN53!z" },
  { name: "John Alfred Saro", email: "ja.saro@emc.edu.ph", password: "Emc@S4kP82!a" },
  { name: "K. Soberano", email: "k.soberano@emc.edu.ph", password: "Emc@S8bN53!f" },
  { name: "M. Cordero", email: "m.cordero@emc.edu.ph", password: "Emc@C8nR52!p" },
  { name: "M. Gervacio", email: "m.gervacio@emc.edu.ph", password: "Emc@G4rT81!x" },
  { name: "R. Villarin", email: "r.villarin@emc.edu.ph", password: "Emc@V4kP82!n" },
  { name: "M. Rayos", email: "m.rayos@emc.edu.ph", password: "Emc@R2nV74!d" },
  { name: "M. Anthony", email: "m.anthony@emc.edu.ph", password: "Emc@A6rL25!x" },
  { name: "R. Gabayno", email: "r.gabayno@emc.edu.ph", password: "Emc@G9qT24!k" },
  { name: "M. Gajol", email: "m.gajol@emc.edu.ph", password: "Emc@G3vL91!n" },
  { name: "J. de Torres", email: "j.detorres@emc.edu.ph", password: "Emc@T6bR54!k" },
  { name: "J. Balleras", email: "j.balleras@emc.edu.ph", password: "Emc@B4wK82!s" },
  { name: "Hairene M. Ambrosio", email: "h.ambrosio@emc.edu.ph", password: "Emc@H7vK92!p" },
  { name: "BJ Ascan", email: "bj.ascan@emc.edu.ph", password: "Emc@A9tQ37!m" },
  { name: "C. Macaraeg", email: "c.macaraeg@emc.edu.ph", password: "Emc@M9kT42!p" },
  { name: "F. Minay", email: "f.minay@emc.edu.ph", password: "Emc@M3vR91!n" },
  { name: "B. Paala", email: "b.paala@emc.edu.ph", password: "Emc@P7mL26!x" },
  { name: "KG Antony", email: "kg.antony@emc.edu.ph", password: "Emc@A6bT54!k" },
  { name: "R. Gaboc", email: "r.gaboc@emc.edu.ph", password: "Emc@G9tQ37!m" },
  { name: "R. Delmo", email: "r.delmo@emc.edu.ph", password: "Emc@D8kP41!q" },
  { name: "A. Dimaculangan", email: "a.dimaculangan@emc.edu.ph", password: "Emc@D5nT83!q" },
  { name: "Rhecah Mae C. Fallena", email: "rm.fallena@emc.edu.ph", password: "Emc@F7kP92!a" },
  { name: "B. Gabia", email: "b.gabia@emc.edu.ph", password: "Emc@B5yR41!s" },
  { name: "S. Cruzat", email: "s.cruzat@emc.edu.ph", password: "Emc@C2rL65!v" },
  { name: "L. Mercado", email: "l.mercado@emc.edu.ph", password: "Emc@M5tR83!n" },
  { name: "M. Garcia", email: "m.garcia@emc.edu.ph", password: "Emc@G7nK35!t" },
  { name: "Judith Cuasay Gabia", email: "j.gabia@emc.edu.ph", password: "Emc@G4kM72!j" },
];

try {
  await sequelize.authenticate();

  let createdCount = 0;
  let updatedCount = 0;

  for (const account of teacherAccounts) {
    const email = normalizeAccountEmail(account.email);
    if (!email) {
      throw new Error(`Invalid email address for ${account.name}: ${account.email}`);
    }
    if (!isValidPassword(account.password)) {
      throw new Error(`Invalid password for ${account.name} (${email})`);
    }

    const passwordHash = await bcrypt.hash(account.password, 10);

    const [user, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        name: account.name.trim(),
        email,
        password: passwordHash,
        role: "teacher",
        department: null,
        authProvider: "password",
        profileCompleted: true,
        isActive: true,
        isVerified: true,
      },
    });

    if (created) {
      createdCount += 1;
    } else {
      await user.update({
        name: account.name.trim(),
        role: "teacher",
        password: passwordHash,
        authProvider: "password",
        profileCompleted: true,
        isActive: true,
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
      });
      updatedCount += 1;
    }

    console.log(`${created ? "Created" : "Updated"} teacher account: ${account.name} <${email}>`);
  }

  console.log(`\nDone. Processed ${teacherAccounts.length} teacher accounts (${createdCount} created, ${updatedCount} updated).`);
} catch (error) {
  console.error("Teacher seeding failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
