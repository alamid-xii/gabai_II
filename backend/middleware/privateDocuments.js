import path from 'node:path';
import jwt from 'jsonwebtoken';
import { User } from '../models/userModel.js';
import { EnrollmentRecord } from '../models/enrollmentRecordModel.js';
import { EnrollmentDocument } from '../models/enrollmentDocumentModel.js';

// Mounted before express.static: a known upload URL is not authorization.
export function privateDocuments(publicDirectory) {
  return async (req, res) => {
    try {
      let userId = req.session?.userId;
      const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      if (token) {
        try { const claims = jwt.verify(token, process.env.JWT_SECRET || 'emc-secret-key-2025'); userId = claims.id || claims.userId; }
        catch { return res.status(401).json({ error: 'Sign in to view this document.' }); }
      }
      if (!userId) return res.status(401).json({ error: 'Sign in to view this document.' });
      const user = await User.findByPk(userId);
      if (!user || !user.isActive) return res.status(403).json({ error: 'Document access denied.' });
      const match = decodeURIComponent(req.path).match(/^\/enrollment-(\d+)\/([a-zA-Z0-9_.-]+)$/);
      if (!match) return res.status(404).json({ error: 'Document not found.' });
      const enrollment = await EnrollmentRecord.findByPk(match[1]);
      if (!enrollment || (enrollment.userId !== user.id && !['admin', 'registrar'].includes(user.role))) return res.status(403).json({ error: 'Document access denied.' });
      const document = await EnrollmentDocument.findOne({ where: { enrollmentId: enrollment.id, filePath: `/uploads/documents/enrollment-${enrollment.id}/${match[2]}` } });
      if (!document) return res.status(404).json({ error: 'Document not found.' });
      const root = path.resolve(publicDirectory);
      const file = path.resolve(root, `.${document.filePath}`);
      if (!file.startsWith(root + path.sep)) return res.status(404).json({ error: 'Document not found.' });
      res.set('Cache-Control', 'private, no-store');
      return res.sendFile(file, error => { if (error && !res.headersSent) res.status(404).json({ error: 'Document not found.' }); });
    } catch { return res.status(500).json({ error: 'Could not load document.' }); }
  };
}

export function protectDocumentUploads(publicDirectory) {
  const serve = privateDocuments(publicDirectory);
  return (req, res, next) => {
    let decoded;
    try { decoded = path.posix.normalize(decodeURIComponent(req.path).replaceAll('\\', '/')); }
    catch { return res.status(400).json({ error: 'Invalid document path.' }); }
    if (!/^\/uploads\/documents(?:\/|$)/i.test(decoded)) return next();
    const scoped = Object.create(req);
    scoped.url = decoded.slice('/uploads/documents'.length) || '/';
    return serve(scoped, res);
  };
}
