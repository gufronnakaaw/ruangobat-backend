export function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  const masked_name =
    name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  return `${masked_name}@${domain}`;
}

export function maskPhoneNumber(phone_number: string) {
  const visible_start = phone_number.slice(0, 2);
  const visible_end = phone_number.slice(-2);
  const masked_middle = '*'.repeat(Math.max(phone_number.length - 4, 0));
  return `${visible_start}${masked_middle}${visible_end}`;
}
