import { documentPublicDirectory } from "../services/documentStorage.js";
﻿import multer from "multer";
import path from "path";
import fs from "fs";
import { EnrollmentDocument } from "../models/enrollmentDocumentModel.js";
import { EnrollmentRecord } from "../models/enrollmentRecordModel.js";

const CREDENTIAL_LABELS = {
  f138: "F-138",
  f137a: "F-137-A",
  cgmc: "CGMC",
  tor: "TOR",
  birthCert: "Birth Certificate",
  marriageCert: "Marriage Certificate",
};

// Use memory storage — files are saved to disk manually in the controller
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type "${file.originalname}". Only PDF, JPG, JPEG, and PNG files are allowed.`));
  }
};

export const uploadDocuments = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// POST /api/enrollments/:id/documents
export const uploadEnrollmentDocuments = async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.id);

    const enrollment = await EnrollmentRecord.findByPk(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    const isOwner = enrollment.userId === req.user.id;
    const isStaff = ["admin", "registrar"].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Ensure upload directory exists
    const uploadDir = path.join(documentPublicDirectory, "uploads", "documents", `enrollment-${enrollmentId}`);
    fs.mkdirSync(uploadDir, { recursive: true });

    const saved = [];

    for (const [docType, files] of Object.entries(req.files)) {
      const file = files[0];

      // Remove old document of same type if exists
      const existing = await EnrollmentDocument.findOne({
        where: { enrollmentId, documentType: docType },
      });
      if (existing) {
        const oldPath = path.join(documentPublicDirectory, existing.filePath);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        await existing.destroy();
      }

      // Save buffer to disk
      const ext = path.extname(file.originalname) || ".jpg";
      const filename = `${docType}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, file.buffer);

      // Store relative path from public/
      const relativePath = `/uploads/documents/enrollment-${enrollmentId}/${filename}`;

      const doc = await EnrollmentDocument.create({
        enrollmentId,
        documentType: docType,
        documentLabel: CREDENTIAL_LABELS[docType] || docType,
        filePath: relativePath,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
      });

      saved.push(doc);
    }

    res.json({ message: "Documents uploaded successfully", documents: saved });
  } catch (error) {
    console.error("Upload documents error:", error);
    res.status(500).json({ error: "Failed to upload documents", details: error.message });
  }
};

// GET /api/enrollments/:id/documents
export const getEnrollmentDocuments = async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.id);

    const enrollment = await EnrollmentRecord.findByPk(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    const isOwner = enrollment.userId === req.user.id;
    const isStaff = ["admin", "registrar"].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: "Access denied" });
    }

    const documents = await EnrollmentDocument.findAll({
      where: { enrollmentId },
      order: [["createdAt", "ASC"]],
    });

    res.json(documents);
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
};

// DELETE /api/enrollments/:id/documents/:docId
export const deleteEnrollmentDocument = async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);

    const enrollment = await EnrollmentRecord.findByPk(enrollmentId);
    if (!enrollment) return res.status(404).json({ error: "Enrollment not found" });

    const isOwner = enrollment.userId === req.user.id;
    const isStaff = ["admin", "registrar"].includes(req.user.role);
    if (!isOwner && !isStaff) return res.status(403).json({ error: "Access denied" });

    if (!isStaff && !['draft', 'returned'].includes(enrollment.status)) return res.status(409).json({ error: 'Open the enrollment for editing before deleting documents.' });

    const doc = await EnrollmentDocument.findOne({ where: { id: docId, enrollmentId } });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const fullPath = path.join(documentPublicDirectory, doc.filePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await doc.destroy();
    res.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
};