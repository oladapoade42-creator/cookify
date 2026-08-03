// A tiny, dependency-free PDF writer. No jsPDF/no network fetch of a new
// package — this hand-builds a minimal valid PDF (Helvetica text on
// Letter-sized pages, paginated automatically) which is all the "Diet
// Plan" download needs. Good for short-to-medium plain text documents.

// PDF content streams here use raw single-byte (Latin-1/WinAnsi) text,
// not UTF-8. AI-generated text (Gemini, etc.) commonly includes smart
// quotes, em/en dashes, and ellipses that fall outside that range —
// left as-is they'd either corrupt the byte stream or render as garbage,
// so swap them for plain-ASCII equivalents first. Anything else outside
// Latin-1 is dropped rather than risk corrupting the file.
function sanitizePdfText(str) {
  return String(str)
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u2000-\u200B]/g, " ")
    .replace(/[^\x00-\xFF]/g, "");
}

function escapePdfText(str) {
  return sanitizePdfText(str).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Converts the final PDF string into raw bytes (one byte per char code) —
// deliberately NOT handed to Blob as a plain string, since Blob encodes
// JS strings as UTF-8, which would turn any byte >= 0x80 (used in the
// xref table's fixed-width offsets, and any Latin-1 punctuation above)
// into a multi-byte sequence and corrupt the file.
function toByteArray(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

// Greedy word-wrap using an approximate average character width for
// Helvetica at the given font size (good enough for a text document —
// not pixel-perfect typesetting).
function wrapLine(line, fontSize, maxWidth) {
  const avgCharWidth = fontSize * 0.5;
  const maxChars = Math.max(10, Math.floor(maxWidth / avgCharWidth));
  if (line.length <= maxChars) return [line];

  const words = line.split(" ");
  const wrapped = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      wrapped.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) wrapped.push(current);
  return wrapped;
}

// title: string; bodyText: string (may contain \n line breaks)
export function generateTextPdfBlob(title, bodyText) {
  const pageWidth = 612; // US Letter, points
  const pageHeight = 792;
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;
  const titleSize = 18;
  const bodySize = 11;
  const lineHeight = 16;

  const rawLines = String(bodyText || "").split("\n");
  const wrappedBody = rawLines.flatMap((l) => (l.trim() ? wrapLine(l, bodySize, maxWidth) : [""]));

  const linesPerPage = Math.floor((pageHeight - margin * 2 - 40) / lineHeight);
  const pages = [];
  for (let i = 0; i < wrappedBody.length; i += linesPerPage) {
    pages.push(wrappedBody.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([]);

  const objects = [];
  // 1: Catalog, 2: Pages (filled in later), fonts start at 3
  const fontObjNum = 3;
  let nextObjNum = 4;
  const pageObjNums = [];
  const contentObjNums = [];

  pages.forEach((pageLines, pageIndex) => {
    const pageObjNum = nextObjNum++;
    const contentObjNum = nextObjNum++;
    pageObjNums.push(pageObjNum);
    contentObjNums.push(contentObjNum);

    let y = pageHeight - margin;
    let stream = "BT\n";
    if (pageIndex === 0) {
      stream += `/F1 ${titleSize} Tf\n1 0 0 1 ${margin} ${y} Tm\n(${escapePdfText(title)}) Tj\n`;
      y -= titleSize + 12;
    }
    stream += `/F1 ${bodySize} Tf\n`;
    pageLines.forEach((line) => {
      stream += `1 0 0 1 ${margin} ${y} Tm\n(${escapePdfText(line)}) Tj\n`;
      y -= lineHeight;
    });
    stream += "ET";

    objects.push({
      num: contentObjNum,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    });
    objects.push({
      num: pageObjNum,
      body: `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjNum} 0 R >>`,
    });
  });

  const pagesKids = pageObjNums.map((n) => `${n} 0 R`).join(" ");
  const allObjects = [
    { num: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
    { num: 2, body: `<< /Type /Pages /Kids [ ${pagesKids} ] /Count ${pageObjNums.length} >>` },
    { num: fontObjNum, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" },
    ...objects,
  ].sort((a, b) => a.num - b.num);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  allObjects.forEach((obj) => {
    offsets[obj.num] = pdf.length;
    pdf += `${obj.num} 0 obj\n${obj.body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  const maxNum = allObjects.length ? Math.max(...allObjects.map((o) => o.num)) : 0;
  let xref = `xref\n0 ${maxNum + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= maxNum; n++) {
    const offset = offsets[n] || 0;
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += xref;
  pdf += `trailer\n<< /Size ${maxNum + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([toByteArray(pdf)], { type: "application/pdf" });
}

export function downloadTextPdf(filename, title, bodyText) {
  const blob = generateTextPdfBlob(title, bodyText);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
