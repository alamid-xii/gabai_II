import { EnrollmentDocument } from '../models/enrollmentDocumentModel.js';
import { policyFor, validateDocuments, validateSelection } from './admissionPolicy.js';

export async function validateForReview(enrollment) {
  if (!['submitted', 'verified', 'approved'].includes(enrollment.status)) throw Object.assign(Error(`Cannot review an enrollment with status: ${enrollment.status}`), { status: 400 });
  if (!enrollment.firstName || !enrollment.familyName) throw Object.assign(Error('Complete the enrollment form before review.'), { status: 400 });
  if (enrollment.sscApplied && (!enrollment.sscResult || (enrollment.sscResult === 'passed' && !enrollment.sscChoiceMade))) throw Object.assign(Error('Complete the SSC exam and student class choice before enrollment approval.'), { status: 400 });
  const { policy } = await policyFor(enrollment);
  validateSelection(policy, enrollment, { sscPlaceholder: Boolean(enrollment.sscResult) });
  validateDocuments(policy, enrollment, await EnrollmentDocument.findAll({ where: { enrollmentId: enrollment.id } }));
}
