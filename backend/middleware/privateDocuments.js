import path from 'node:path';
import { authenticateRequest, authenticationError } from '../services/authentication.js';
import { EnrollmentRecord } from '../models/enrollmentRecordModel.js';
import { EnrollmentDocument } from '../models/enrollmentDocumentModel.js';

// Mounted before express.static: a known upload URL is not authorization.
export function privateDocuments(publicDirectory) {
  return async (req, res) => {
    try {
      const user = await authenticateRequest(req, { allowSession: true });
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
    } catch (error) {
      if (error.status) return authenticationError(res, error);
      return res.status(500).json({ error: 'Could not load document.' });
    }
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
