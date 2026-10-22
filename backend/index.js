/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
    
import express from "express";
import path from "path";
import session from "express-session";
import flash from "connect-flash";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/index.js";
import fs from 'fs';
import hbs from "hbs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { sequelize } from "./models/db.js";
import "./models/enrollmentDocumentModel.js"; // ensure table is synced
import "./models/gradingPeriodModel.js";       // ensure grading_periods table is synced
import "./models/classScheduleModel.js";      // ensure class_schedules table is synced

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

app.use(session({
  secret: "xianfire-secret-key",
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

app.engine("xian", async (filePath, options, callback) => {
  try {
     const originalPartialsDir = hbs.partialsDir;
    hbs.partialsDir = path.join(__dirname, 'views');

    const result = await new Promise((resolve, reject) => {
      hbs.__express(filePath, options, (err, html) => {
        if (err) return reject(err);
        resolve(html);
      });
    });

    hbs.partialsDir = originalPartialsDir;
    callback(null, result);
  } catch (err) {
    callback(err);
  }
});
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});


app.set("views", path.join(__dirname, "views"));
app.set("view engine", "xian");
const partialsDir = path.join(__dirname, "views/partials");
fs.readdir(partialsDir, (err, files) => {
  if (err) {
    console.error("❌ Could not read partials directory:", err);
    return;
  }

   files
    .filter(file => file.endsWith('.xian'))
    .forEach(file => {
      const partialName = file.replace('.xian', ''); 
      const fullPath = path.join(partialsDir, file);

      fs.readFile(fullPath, 'utf8', (err, content) => {
        if (err) {
          console.error(`❌ Failed to read partial: ${file}`, err);
          return;
        }
        hbs.registerPartial(partialName, content);
        
      });
    });
});

app.use("/", router);

// Sync only new tables, don't alter existing ones (SQLite doesn't support ALTER well)
const syncPromise = sequelize.sync({ alter: false }).catch(err => {
  console.error("DB sync error:", err);
});

// Manually add new columns if they don't exist yet (safe for SQLite)
async function addMissingColumns() {
  try {
    const queries = [
      `ALTER TABLE enrollment_records ADD COLUMN sectionId INTEGER`,
      `ALTER TABLE enrollment_records ADD COLUMN sectionName VARCHAR(50)`,
      `ALTER TABLE sections ADD COLUMN strand VARCHAR(50)`,
      `ALTER TABLE users ADD COLUMN role ENUM('student', 'registrar', 'admin', 'teacher') NOT NULL DEFAULT 'student'`,
      `ALTER TABLE users ADD COLUMN department VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT 1`,
      `ALTER TABLE users ADD COLUMN isVerified BOOLEAN DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN verificationToken VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN verificationExpires DATETIME`,
      `ALTER TABLE users ADD COLUMN authProvider VARCHAR(20) NOT NULL DEFAULT 'password'`,
      `ALTER TABLE users ADD COLUMN googleId VARCHAR(255) NULL`,
      `CREATE UNIQUE INDEX users_googleId_unique ON users (googleId)`,
      `ALTER TABLE enrollment_records MODIFY COLUMN enrollmentType ENUM('new', 'old', 'transferee', 'returnee') NULL`,
      `ALTER TABLE sections ADD COLUMN teacherId INTEGER`,
      `ALTER TABLE enrollment_records ADD COLUMN lifeStatus VARCHAR(20)`,
      `ALTER TABLE enrollment_records ADD COLUMN lifeStatusReason TEXT`,
      `ALTER TABLE enrollment_records ADD COLUMN lifeStatusDate TEXT`,
      `ALTER TABLE enrollment_records ADD COLUMN lifeStatusUpdatedBy INTEGER`,
      `ALTER TABLE enrollment_records ADD COLUMN destinationSchool VARCHAR(200)`,
      `ALTER TABLE enrollment_records ADD COLUMN sscChoiceMade INTEGER DEFAULT 0`,
      `ALTER TABLE enrollment_subjects ADD COLUMN teacherId INTEGER`,
      `ALTER TABLE enrollment_subjects ADD COLUMN q1 DECIMAL(5,2)`,
      `ALTER TABLE enrollment_subjects ADD COLUMN q2 DECIMAL(5,2)`,
      `ALTER TABLE enrollment_subjects ADD COLUMN q3 DECIMAL(5,2)`,
      `ALTER TABLE enrollment_subjects ADD COLUMN q4 DECIMAL(5,2)`,
      `ALTER TABLE enrollment_subjects ADD COLUMN finalGrade DECIMAL(5,2)`,
      `ALTER TABLE enrollment_subjects ADD COLUMN remarks VARCHAR(20)`,
    ];
    for (const q of queries) {
      try {
        await sequelize.query(q);
      } catch (_) {
        // Column already exists — ignore
      }
    }
  } catch (err) {
    console.error('Column migration error:', err.message);
  }
}
await syncPromise;
await addMissingColumns();

export default app;

if (!process.env.ELECTRON) {
  const server = app.listen(PORT, () => console.log(`🔥 XianFire running at http://localhost:${PORT}`));
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use. Stop the other process (e.g. npx kill-port ${PORT}) and restart.`);
      process.exitCode = 1;
    } else {
      console.error("Server error:", err);
    }
  });
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });
}
