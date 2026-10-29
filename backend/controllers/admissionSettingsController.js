import { AdmissionSettings } from '../models/admissionSettingsModel.js';
import { EnrollmentRecord } from '../models/enrollmentRecordModel.js';
import { EnrollmentDocument } from '../models/enrollmentDocumentModel.js';
import { sequelize } from '../models/db.js';
import { currentAdmission, policyFor, checklist, validateAdmission, validateSelection, validateDocuments } from '../services/admissionPolicy.js';
import { sendEnrollmentSubmittedEmail } from '../services/emailService.js';

export async function getAdmissionSettings(req, res) {
  try { const data = await currentAdmission(); res.set('Cache-Control', 'no-store'); return res.json({ content: data.policy, revision: data.revision }); }
  catch (error) { return res.status(503).json({ error: error.message }); }
}
export async function updateAdmissionSettings(req, res) {
  try {
    const { revision, content } = req.body || {};
    if (!Number.isSafeInteger(revision) || revision < 1) return res.status(400).json({ error: 'A valid settings revision is required.' });
    const policy = validateAdmission(content);
    const [changed] = await AdmissionSettings.update({ content: policy, revision: revision + 1 }, { where: { id: 1, revision } });
    if (!changed) return res.status(409).json({ error: 'Settings changed by another admin. Reload before saving.' });
    return res.json({ content: policy, revision: revision + 1 });
  } catch (error) { return res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not save admission settings.' }); }
}
export async function getApplicationPolicy(req, res) {
  try {
    const enrollment = await EnrollmentRecord.findByPk(req.params.id);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    if (enrollment.userId !== req.user.id && !['admin', 'registrar'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    const data = await policyFor(enrollment);
    return res.json({ content: data.policy, revision: data.revision, checklist: checklist(data.policy, enrollment) });
  } catch { return res.status(503).json({ error: 'Could not load application rules.' }); }
}
export function createSubmissionHandler({ notify = sendEnrollmentSubmittedEmail } = {}) {
return async function submitApplication(req, res) {
  try {
    const result = await sequelize.transaction(async transaction => {
      const enrollment = await EnrollmentRecord.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!enrollment) throw Object.assign(Error('Enrollment not found'), { status: 404 });
      if (enrollment.userId !== req.user.id) throw Object.assign(Error('Access denied'), { status: 403 });
      if (!['draft', 'returned'].includes(enrollment.status)) {
        if (['submitted', 'pending_exam'].includes(enrollment.status) && enrollment.firstName) return { enrollment, alreadySubmitted: true };
        throw Object.assign(Error('This application cannot be submitted in its current status.'), { status: 409 });
      }
      const { policy, revision } = await policyFor(enrollment);
      for (const key of ['familyName', 'firstName', 'sex', 'dateOfBirth']) if (!enrollment[key]) throw Object.assign(Error('Complete the required personal information before submitting.'), { status: 400 });
      validateSelection(policy, enrollment, { sscPlaceholder: Boolean(enrollment.sscResult) });
      const docs = await EnrollmentDocument.findAll({ where: { enrollmentId: enrollment.id }, transaction });
      validateDocuments(policy, enrollment, docs);
      const status = enrollment.sscApplied && !enrollment.sscResult ? 'pending_exam' : 'submitted';
      await enrollment.update({ status, admissionPolicy: policy, admissionRevision: revision, admissionCredentials: docs.map(doc => doc.documentType), ...(enrollment.sscApplied && !enrollment.sscResult ? { sscQualified: true } : {}) }, { transaction });
      return { enrollment };
    });
    if (!result.alreadySubmitted) { try { await notify(req.user, result.enrollment.toJSON()); } catch { /* Submission remains saved when email is unavailable. */ } }
    return res.json({ message: 'Enrollment submitted successfully.', enrollment: result.enrollment });
  } catch (error) { return res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not submit enrollment.' }); }
}

}
export const submitApplication = createSubmissionHandler();
