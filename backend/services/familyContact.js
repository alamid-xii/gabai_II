export function validateFamilyContact(record) {
  const contacts = ['father', 'mother', 'guardian'].filter(key => [record[`${key}Name`], record[`${key}Occupation`], record[key === 'guardian' ? 'guardianTelephone' : `${key}MobileNumber`], key === 'guardian' ? record.guardianAddress : ''].some(value => String(value || '').trim()));
  if (!contacts.length) throw Object.assign(Error('Provide at least one parent or guardian contact.'), { status: 400 });
  for (const key of contacts) {
    if (!record[`${key}Name`]?.trim()) throw Object.assign(Error(`Provide the ${key} full name.`), { status: 400 });
    const phone = record[key === 'guardian' ? 'guardianTelephone' : `${key}MobileNumber`];
    if (!/^09\d{9}$/.test(phone || '')) throw Object.assign(Error(`Enter a valid mobile number for the ${key}.`), { status: 400 });
    const address = record[key === 'guardian' ? 'guardianAddress' : 'parentsAddress'];
    if (!address?.trim()) throw Object.assign(Error(`Provide the ${key} address.`), { status: 400 });
  }
}
