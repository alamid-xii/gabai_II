import { Section, sequelize } from "./models/sectionModel.js";
import { User } from "./models/userModel.js";
import { validateSectionConfiguration } from "./services/academicScope.js";

const SCHOOL_YEAR = "2026-2027";
const DEFAULT_SEMESTER = "1st Trimester";
const DEFAULT_CAPACITY = 50;

const jhsSections = [
  // Grade 7
  { code: "JHS-7-ASTER", yearLevel: 7, strand: null, instructor: "Rhecah Mae C. Fallena", room: "101" },
  { code: "JHS-7-CARNATION", yearLevel: 7, strand: null, instructor: "Elsa M. Castillo", room: "102" },
  { code: "JHS-7-GLADIOLUS", yearLevel: 7, strand: null, instructor: "Jomari M. Javier", room: "103" },
  { code: "JHS-7-MARIGOLD", yearLevel: 7, strand: null, instructor: "Roy D. Gabayno", adviserEmail: "r.gabayno@emc.edu.ph", room: "104" },
  { code: "JHS-7-DAFFODIL", yearLevel: 7, strand: null, instructor: "Sunshine Jane C. Ferrera", room: "108" },
  { code: "JHS-7-EUCLID", yearLevel: 7, strand: "SSC", instructor: "Hairene M. Ambrosio", room: null },

  // Grade 8
  { code: "JHS-8-CHRONICLES", yearLevel: 8, strand: null, instructor: "May I. Dulce", room: "109" },
  { code: "JHS-8-JOSHUA", yearLevel: 8, strand: null, instructor: "Jared C. Ramat", room: "205" },
  { code: "JHS-8-JOHN", yearLevel: 8, strand: null, instructor: "Crystal F. Galin", room: "207" },
  { code: "JHS-8-MATTHEW", yearLevel: 8, strand: null, instructor: "Jean Jean M. Soledad", room: "211" },
  { code: "JHS-8-THADDEUS", yearLevel: 8, strand: null, instructor: "Kriz Kimberly Lee M. Montante", room: "216" },
  { code: "JHS-8-NEWTON", yearLevel: 8, strand: "SSC", instructor: "Jemina Carayag", room: null },

  // Grade 9
  { code: "JHS-9-POSEIDON", yearLevel: 9, strand: null, instructor: "Joan V. Cuasay", room: "120" },
  { code: "JHS-9-VENUS", yearLevel: 9, strand: null, instructor: "Rachelle Joy O. Inocencio", room: "208" },
  { code: "JHS-9-HERA", yearLevel: 9, strand: null, instructor: "John Christian S. Saro", room: "209" },
  { code: "JHS-9-HESTIA", yearLevel: 9, strand: null, instructor: "Kevin M. Villarin", room: "210" },
  { code: "JHS-9-APOLLO", yearLevel: 9, strand: null, instructor: "Renier F. Gadon", room: null },
  { code: "JHS-9-MAXWELL", yearLevel: 9, strand: "SSC", instructor: "Judith Cuasay Gabia", room: "117" },

  // Grade 10
  { code: "JHS-10-BALETE", yearLevel: 10, strand: null, instructor: "Mert Joy M. Ricamara", room: "201" },
  { code: "JHS-10-NARRA", yearLevel: 10, strand: null, instructor: "Maricel H. Nicolas", room: "202" },
  { code: "JHS-10-MOLAVE", yearLevel: 10, strand: null, instructor: "Gechiela Gintis B. Delos Reyes", room: "203" },
  { code: "JHS-10-ACACIA", yearLevel: 10, strand: null, instructor: "Jack Denniel F. Fernandez", room: "204" },
  { code: "JHS-10-PASCAL", yearLevel: 10, strand: "SSC", instructor: "Vincent G. Gerance", room: null },
];

try {
  await sequelize.authenticate();

  const teachers = await User.findAll({
    where: { role: "teacher", isActive: true },
    attributes: ["id", "name", "email"],
  });
  const byName = new Map(teachers.map((t) => [t.name.trim().toLowerCase(), t]));
  const byEmail = new Map(teachers.map((t) => [t.email.trim().toLowerCase(), t]));

  let createdCount = 0;
  let updatedCount = 0;
  const unmatchedAdvisers = [];

  for (const item of jhsSections) {
    const matchedTeacher =
      byName.get(item.instructor.trim().toLowerCase()) ||
      (item.adviserEmail ? byEmail.get(item.adviserEmail.trim().toLowerCase()) : null) ||
      null;

    if (!matchedTeacher) {
      unmatchedAdvisers.push(`${item.code} (${item.instructor})`);
    }

    const payload = {
      code: item.code,
      course: "JHS",
      yearLevel: item.yearLevel,
      strand: item.strand,
      semester: DEFAULT_SEMESTER,
      schoolYear: SCHOOL_YEAR,
      instructor: item.instructor,
      teacherId: matchedTeacher ? matchedTeacher.id : null,
      room: item.room,
      capacity: DEFAULT_CAPACITY,
      isActive: true,
    };

    validateSectionConfiguration(payload);

    const [section, created] = await Section.findOrCreate({
      where: { code: payload.code, schoolYear: payload.schoolYear },
      defaults: payload,
    });

    if (created) {
      createdCount += 1;
    } else {
      await section.update(payload);
      updatedCount += 1;
    }

    const linkNote = matchedTeacher
      ? `teacherId=${matchedTeacher.id} (${matchedTeacher.email})`
      : "teacherId=null (no matching teacher account)";
    console.log(`${created ? "Created" : "Updated"} ${payload.code} | Grade ${payload.yearLevel} ${payload.strand || "Regular"} | ${payload.instructor} [${linkNote}] | Room: ${payload.room || "—"}`);
  }

  console.log(`\nDone. Processed ${jhsSections.length} sections (${createdCount} created, ${updatedCount} updated).`);
  if (unmatchedAdvisers.length > 0) {
    console.log(`Unmatched advisers (teacherId left null): ${unmatchedAdvisers.join(", ")}`);
  }
} catch (error) {
  console.error("Section seeding failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
