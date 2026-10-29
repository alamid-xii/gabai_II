const PROFILE_FIELDS = ['firstName', 'middleName', 'lastName', 'mobileNumber'];
const explicitFalse = value => value === false || value === 0 || value === '0';

export function needsProfileCompletion(user) {
  return user?.authProvider === 'google' && explicitFalse(user.profileCompleted);
}

// Only safe account fields belong in authentication and profile responses.
export function serializeUser(user) {
  return {
    id: user.id, name: user.name, email: user.email, role: user.role,
    authProvider: user.authProvider || 'password',
    firstName: user.firstName || null,
    middleName: user.middleName || null,
    lastName: user.lastName || null,
    mobileNumber: user.mobileNumber || null,
    profileCompleted: !explicitFalse(user.profileCompleted),
  };
}

export function newGoogleProfile(profile) {
  // Google names are suggestions for confirmation, not a completed student profile.
  return {
    firstName: typeof profile.given_name === 'string' ? profile.given_name.trim().slice(0, 100) || null : null,
    middleName: null,
    lastName: typeof profile.family_name === 'string' ? profile.family_name.trim().slice(0, 100) || null : null,
    mobileNumber: null,
    profileCompleted: false,
  };
}

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function validateName(value, label, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string') invalid(`${label} is required.`);
  const name = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!name) {
    if (optional) return null;
    invalid(`${label} is required.`);
  }
  if (name.length > 100) invalid(`${label} must be no more than 100 characters.`);
  if (!/^[\p{L}\p{M} '\u2019-]+$/u.test(name) || !/\p{L}/u.test(name)) {
    invalid(`${label} may contain letters, spaces, apostrophes and hyphens only.`);
  }
  return name;
}

export function profileUpdates(body = {}, user = {}) {
  if (PROFILE_FIELDS.some(field => body[field] !== undefined)) {
    const firstName = validateName(body.firstName, 'First name');
    const middleName = validateName(body.middleName, 'Middle name', true);
    const lastName = validateName(body.lastName, 'Last name');
    const mobileNumber = body.mobileNumber;
    if (typeof mobileNumber !== 'string' || !/^09[0-9]{9}$/.test(mobileNumber)) {
      invalid('Mobile number must contain exactly 11 digits and start with 09.');
    }
    const name = [firstName, middleName, lastName].filter(Boolean).join(' ');
    if (name.length > 255) invalid('The combined name must be no more than 255 characters.');
    return { firstName, middleName, lastName, mobileNumber, name, profileCompleted: true };
  }
  if (body.name !== undefined) {
    if (user.firstName || user.lastName || user.mobileNumber || needsProfileCompletion(user)) {
      invalid('Update your first name, middle name, last name and mobile number together.');
    }
    if (typeof body.name !== 'string' || !body.name.trim()) invalid('Name cannot be empty.');
    if (body.name.trim().length > 100) invalid('Name is too long.');
    return { name: body.name.trim() };
  }
  return {};
}
