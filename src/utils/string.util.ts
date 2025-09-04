export function buildContext(context: string | string[]) {
  let contextText = '';

  if (Array.isArray(context)) {
    contextText = context
      .map((ctx, i) => `\tContext #${i + 1}:\n\t${ctx}`)
      .join('\n\n');
  } else if (typeof context === 'string') {
    contextText = context;
  }

  return `[CONTEXT]
${contextText}`;
}

// export function buildPrompt(
//   context?: string | string[],
//   has_image?: boolean | number,
// ): string {
//   let contextText = '';

//   if (Array.isArray(context)) {
//     contextText = context
//       .map((ctx, i) => `\tContext #${i + 1}:\n\t${ctx}`)
//       .join('\n\n');
//   } else if (typeof context === 'string') {
//     contextText = context;
//   }

//   if (has_image) {
//     if (contextText) {
//       return `
//     [INSTRUCTION]
//     ${prompts.INSTRUCTION}

//     [CONTEXT]
// ${contextText}

//     [ANSWER_FORMAT]
//     ${prompts.ANSWER_FORMAT}`;
//     } else {
//       return `
//     [INSTRUCTION]
//     ${prompts.INSTRUCTION}

//     [ANSWER_FORMAT]
//     ${prompts.ANSWER_FORMAT}`;
//     }
//   }

//   if (contextText) {
//     return `
//     [INSTRUCTION]
//     ${prompts.INSTRUCTION}

//     [CONTEXT]
// ${contextText}

//     [ANSWER_FORMAT]
//     ${prompts.ANSWER_FORMAT}`;
//   }

//   return `
//     [INSTRUCTION]
//     ${prompts.INSTRUCTION}

//     [ANSWER_FORMAT]
//     ${prompts.ANSWER_FORMAT}`;
// }

export function parseIsActive(val: any): boolean | undefined {
  if (val === undefined) return undefined;
  return val === 'true' || val === true;
}

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

export function slug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function capitalize(words: string) {
  return words
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getInitials(words: string) {
  return words
    .split(' ')
    .map((word) => word.charAt(0))
    .join('');
}

export function scoreCategory(score: number): string {
  if (typeof score !== 'number' || isNaN(score)) return '-';
  if (score < 0 || score > 100) return '-';

  if (score >= 81) return 'A';
  if (score >= 61) return 'B';
  if (score >= 41) return 'C';
  if (score >= 21) return 'D';
  return 'E';
}

export function getFrontendUrl(env: string): string {
  if (env === 'prod') {
    return 'https://ruangobat.id';
  } else {
    return 'https://devmain.ruangobat.id';
  }
}

type TypeProduct =
  | 'register'
  | 'videocourse'
  | 'apotekerclass'
  | 'research'
  | 'theses'
  | 'program';

type EmailTemplateParams = {
  fullname: string;
  env: string;
  type: TypeProduct[];
  path?: string;
  program_name?: string;
};

export function generateEmailTemplate({
  fullname,
  env,
  type,
  path,
  program_name,
}: EmailTemplateParams) {
  if (type.includes('register')) {
    return `<p style="font-family: Inter, sans-serif; font-size: 16px; color: #333;">
  Halo <strong style="color: #000;">${fullname}</strong>! 👋
</p><br/>

<p style="font-family: Inter, sans-serif; font-size: 16px; color: #333;">
  Selamat datang di <strong style="color: #6238C3;">RuangObat.id</strong> 🎉<br>
  Selamat kamu sekarang sudah jadi bagian dari <strong style="color: #6238C3;">10.000+ mahasiswa farmasi</strong> 
  yang belajar bareng dengan cara yang ilmiah tapi asik!
</p><br/>

<p style="font-family: Inter, sans-serif; font-size: 16px; color: #333;">
  Untuk bantu kamu mulai, kami sudah siapkan konten terbaik sesuai tahap kamu sekarang:
</p>

<p style="font-family: Inter, sans-serif; font-size: 16px; color: #333;">
  🧭 <strong style="color: #000;">Kamu lagi di fase:</strong><br>
  <strong style="color: #333;">[MABA / Semester 1–8]</strong><br>
  📚 Akses video pembelajaran & tanya jawab langsung via <strong style="color: #6238C3;">AI Farmasi Pertama di Indonesia</strong><br>
  🎯 <a href="${getFrontendUrl(env)}/video" target="_blank" style="color: #007bff; text-decoration: underline;">Coba video pembelajaran</a><br>
  🤖 <a href="${getFrontendUrl(env)}/rosa" target="_blank" style="color: #007bff; text-decoration: underline;">Eksplor AI</a>
</p><br/>

<p style="font-family: Inter, sans-serif; font-size: 16px; color: #333;">
  <strong style="color: #333;">[Mahasiswa Akhir]</strong><br>
  📌 Butuh bimbingan skripsi & riset farmasi?<br>
  🚀 <a href="${getFrontendUrl(env)}/kelas" target="_blank" style="color: #007bff; text-decoration: underline;">Mulai dari sini</a>
</p><br/>

<p style="font-family: Inter, sans-serif; font-size: 16px; color: #333;">
  <strong style="color: #333;">[Lulusan S1 Farmasi]</strong><br>
  🎓 Siap lanjut ke profesi apoteker?<br>
  💥 <a href="${getFrontendUrl(env)}/kelas/masuk-apoteker" target="_blank" style="color: #007bff; text-decoration: underline;">Tryout + bimbel masuk profesi ada di sini</a>
</p><br/> 

<p style="font-family: Inter, sans-serif; font-size: 16px; color: #333;">
  <strong style="color: #333;">[Mahasiswa Profesi Apoteker]</strong><br>
  💊 Tryout UKMPPAI & OSCE Nasional full paket<br>
  🔥 <a href="${getFrontendUrl(env)}/osce-ukmppai" target="_blank" style="color: #007bff; text-decoration: underline;">Akses latihan dan videonya di sini</a>
</p><br/>

<p style="font-family: Inter, sans-serif; font-size: 16px; color: #333;">
  Kalau kamu bingung mulai dari mana, tinggal chat kami aja ya. Tim RuangObat selalu siap bantu!
</p>

<p style="font-family: Inter, sans-serif; font-size: 16px; color: #333;">
  Let's belajar farmasi bareng dengan cara yang beda. 🚀<br><br>
  <strong style="color: #000;">Tim RuangObat</strong>
</p>`;
  }

  if (type.includes('research') || type.includes('theses')) {
    return `<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Halo <strong style="color: #000;">${fullname}</strong>! 📚
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Kamu udah resmi terdaftar di program <strong style="color: #6238C3;">Bimbingan Skripsi & Riset Farmasi</strong> dari <strong style="color: #6238C3;">RuangObat</strong>.
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Tim pembimbing kami siap bantu kamu dari <strong style="color: #6238C3;">cari topik</strong> sampai <strong style="color: #6238C3;">siap sidang</strong>. Santai, kamu gak sendirian ✨
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  👉 <a href="https://api.whatsapp.com/send?phone=6282289509438" target="_blank" style="color: #6238C3; text-decoration: underline;">Langsung mulai proses bimbingan kamu di sini</a>
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Kalau ada kendala atau bingung langkahnya, tinggal chat aja. Kita siap bantu kamu <strong style="color: #6238C3;">lulus dengan percaya diri</strong>! 🎯
</p>
`;
  }

  if (type.includes('apotekerclass')) {
    return `<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Hai <strong style="color: #000;">${fullname}</strong>! 🎓
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Selamat ya! Kamu udah resmi gabung di program <strong style="color: #6238C3;">Persiapan Masuk Apoteker</strong> bareng <strong style="color: #6238C3;">RuangObat</strong>.
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Sekarang saatnya fokus ke <strong style="color: #6238C3;">materi dasar</strong> + <strong style="color: #6238C3;">tryout simulasi</strong> biar nanti pas kuliah nggak kagok dan udah siap tempur 💥
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  👉 <a href="${getFrontendUrl(env)}/kelas/masuk-apoteker" target="_blank" style="color: #6238C3; text-decoration: underline;">Yuk mulai dari sini</a>
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Tim kami udah standby buat bantu kamu belajar dari sekarang — biar lebih tenang, lebih pede, dan pastinya lebih siap! 🚀
</p>
`;
  }

  if (type.includes('videocourse')) {
    return `<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Hi <strong style="color: #000;">${fullname}</strong>! 🎓
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Thank you udah berlangganan <strong style="color: #6238C3;">Video Pembelajaran</strong> di <strong style="color: #6238C3;">RuangObat</strong>!
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Sekarang kamu bisa langsung akses semua <strong style="color: #6238C3;">materi kuliah dari semester 1–8</strong> dalam format video yang asik, interaktif, dan 100% relevan buat mahasiswa farmasi.
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  👉 <a href="${getFrontendUrl(env)}/video" target="_blank" style="color: #6238C3; text-decoration: underline;">Klik di sini buat mulai belajar</a>
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  🤔 Masih bingung atau ngerasa butuh arahan lebih personal?<br>
  Tenang! Kamu bisa daftar ke program <strong style="color: #6238C3;">Bimbel Private 1-on-1</strong> bareng mentor farmasi terbaik kami — <strong style="color: #6238C3;">100% custom sesuai kebutuhan kamu</strong>.
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  🎯 <a href="${getFrontendUrl(env)}/kelas/private-1-on-1" target="_blank" style="color: #6238C3; text-decoration: underline;">Daftar bimbel private sekarang</a>
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Yuk, mulai belajar dengan cara yang paling cocok buat kamu.<br>
  <strong style="color: #000;">Tim RuangObat</strong> siap dukung sampai kamu paham beneran 💪
</p>
`;
  }

  if (type.includes('program')) {
    return `<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Halo <strong style="color: #000;">${fullname}</strong>! 💊
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Kamu udah resmi gabung di <strong style="color: #6238C3;">${program_name}</strong> bareng <strong style="color: #6238C3;">RuangObat</strong>! 🎉
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Sekarang waktunya buat <strong style="color: #6238C3;">latihan soal</strong>, nonton <strong style="color: #6238C3;">video pembahasan</strong>, dan nyiapin mental buat ujian beneran. Gaskeun!
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  👉 <a href="${getFrontendUrl(env)}${path}" target="_blank" style="color: #007bff; text-decoration: underline;">Langsung buka linknya di sini</a>
</p>

<p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
  Kalau kamu butuh panduan urutan belajar atau masih bingung mulai dari mana, tinggal colek aja ya. 
  <strong style="color: #000;">Tim RuangObat</strong> selalu standby bantu kamu taklukin ujian 🎯
</p>
`;
  }
}

export function maskingFileUrl(file_url: string, mode: string) {
  if (!file_url) return null;

  const url = new URL(file_url);
  const storage_hosts = [
    'ruangobat.is3.cloudhost.id',
    'ruangobatdev.is3.cloudhost.id',
    'is3.cloudhost.id',
  ];

  if (!storage_hosts.includes(url.host)) {
    const host = `https://${mode === 'prod' ? 'ruangobat' : 'ruangobatdev'}.is3.cloudhost.id`;
    const clean_path = url.pathname.replace('/public', '');
    return host + clean_path;
  }

  return file_url;
}

export function parseSortQuery(
  query: string,
  fields: string[],
): Record<string, 'asc' | 'desc'> {
  const [field, direction] = query.split('.');

  const is_valid_field = fields.includes(field);
  const is_valid_direction = direction === 'asc' || direction === 'desc';

  if (is_valid_field && is_valid_direction) {
    return { [field]: direction };
  }

  return {};
}

export function generateInvoiceNumberCustom(
  prefix = 'INV',
  code = 'MAIN',
  date_string: string,
  last_number = 0,
): string {
  const serial = String(last_number + 1).padStart(5, '0');
  return `${prefix}-${code}-${date_string}-${serial}`;
}

export function isUUID(str: string) {
  const regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(str);
}

export function toE164(input: string, countryCode = '62'): string | null {
  let normalized = input.replace(/[^\d+]/g, '');

  if (normalized.startsWith('+')) {
    const regex = new RegExp(`^\\+${countryCode}0+`);
    if (regex.test(normalized)) {
      normalized = normalized.replace(regex, `+${countryCode}`);
    }
    return normalized;
  }

  if (normalized.startsWith('0')) {
    return `+${countryCode}${normalized.replace(/^0+/, '')}`;
  }

  if (normalized.startsWith(countryCode)) {
    return `+${normalized}`;
  }

  return null;
}
