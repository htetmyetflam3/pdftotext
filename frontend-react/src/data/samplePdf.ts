/**
 * The sample document offered by the hero demo.
 *
 * It is kept in two places on purpose: `public/sample-zawgyi.pdf` (a real file
 * the site hands out) and this copy, which is bundled into the page so the
 * demo still works if the file ever goes missing.
 *
 * Word-final asats are stored as U+1039 (legacy WinBurmese / Zawgyi style) —
 * that is exactly what the converter detects and repairs.
 */
export const SAMPLE_PDF = `%PDF-1.4
% AKKHARA sample document - legacy Zawgyi-era PDF used by the hero demo.
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [ 3 0 R 4 0 R 5 0 R ] /Count 3 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595 842 ] /Resources << /Font << /F1 6 0 R /F2 7 0 R >> >> /Contents 9 0 R >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595 842 ] /Resources << /Font << /F1 6 0 R /F2 7 0 R >> >> /Contents 10 0 R >>
endobj
5 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595 842 ] /Resources << /Font << /F1 6 0 R /F2 7 0 R >> >> /Contents 11 0 R >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>
endobj
7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>
endobj
9 0 obj
<< /Length 1280 >>
stream
BT /F2 17 Tf 56 790 Td (မြန်မာဘာသာ စာပေ — နမူနာစာမျက်နှာ) Tj ET
BT /F1 12 Tf 56 756 Td (ဤဖိုင်သည္ အရင်က Zawgyi ဖောင်တော်ဖြင့္ ရေးသားထားသော PDF ၏ နမူနာ ဖြစ်ပါသည္။) Tj ET
BT /F1 12 Tf 56 730 Td (အခြား converter များဖြင့္ ထုတ်ယူလျှင် စာသားသည္ ဖတ်၍မရဘဲ စာလုံးများ ပျက်စီးနေပါမည္။) Tj ET
BT /F1 12 Tf 56 704 Td (ဥပမာ — သင်၏ သတင်းစာ၊ ဥပဒေစာအုပ်များကို ဖတ်နိုင်အောင် ပြုလုပ်ပေးပါသည္။) Tj ET
endstream
endobj
10 0 obj
<< /Length 1180 >>
stream
BT /F2 15 Tf 56 790 Td (ဒုတိယစာမျက်နှာ — ပြောင်းလဲမှု ရလဒ်) Tj ET
BT /F1 12 Tf 56 756 Td (ကျွန်ုပ်တို့၏ နည်းလမ်းဖြင့္ စာသားအားလုံးကို Unicode အဖြစ် ပြောင်းလဲပြီး ကူးယူနိုင် ပြင်ဆင်နိုင်ပါသည္။) Tj ET
BT /F1 12 Tf 56 730 Td (Word တွင် DOCX အဖြစ် ဆက်လက် အသုံးပြုနိုင်ပြီး စာလုံးအရွယ်အစားလည်း မပျက်ပါ။) Tj ET
BT /F1 12 Tf 56 704 Td (စာလုံးပေါင်းနှင့္ ဝါကျဖွဲ့စည်းမှုကိုလည်း တစ်ဆင့်ချင်း စစ်ဆေးပေးပါသည္။) Tj ET
endstream
endobj
11 0 obj
<< /Length 980 >>
stream
BT /F2 15 Tf 56 790 Td (တတိယစာမျက်နှာ — စုစုပေါင်း အချက်အလက်) Tj ET
BT /F1 12 Tf 56 756 Td (စာမျက်နှာ ၁ မှ ၃ အထိ အစုလိုက် ထုတ်ယူနိုင်ပြီး အချိန် ၈ စက္ကန့်အတွင်း ပြီးပါသည္။) Tj ET
BT /F1 12 Tf 56 730 Td (ရလဒ်ကို TXT နှင့္ DOCX အဖြစ် သိမ်းဆည်းနိုင်ပြီး စာသားအားလုံး ရွေးချယ်နိုင်ပါသည္။) Tj ET
BT /F1 11 Tf 56 690 Td (AKKHARA — မြန်မာ PDF မှ စာသားထုတ်ယူသည့် ကိရိယာ) Tj ET
endstream
endobj
xref
0 12
0000000000 65535 f 
0000000015 00000 n 
0000000074 00000 n 
0000000158 00000 n 
0000000305 00000 n 
0000000452 00000 n 
0000000599 00000 n 
0000000716 00000 n 
0000000840 00000 n 
0000000944 00000 n 
0000002320 00000 n 
0000003600 00000 n 
trailer
<< /Size 12 /Root 1 0 R /Info << /Title (AKKHARA sample - legacy Zawgyi PDF) /Producer (AKKHARA) >> >>
startxref
0
%%EOF
`;

export function sampleBlob(): Blob {
  return new Blob([SAMPLE_PDF], { type: "application/pdf" });
}
