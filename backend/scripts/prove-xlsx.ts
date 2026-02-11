import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

function normalizeName(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s ? s : null;
}

async function main() {
  const fileArgIndex = process.argv.indexOf("--file");
  const fileName = fileArgIndex >= 0 ? process.argv[fileArgIndex + 1] : null;

  if (!fileName) {
    console.error("Usage: bun run scripts/prove-xlsx.ts");
    process.exit(1);
  }

  const XLSX_DIR = path.resolve(process.cwd(), "xlsx_files");
  const filePath = path.join(XLSX_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
    raw: false,
  });

  const rawCount = rows.length;

  const normalized = rows.map((r) => normalizeName(r.school_name));
  const emptyCount = normalized.filter((v) => v === null).length;

  const validNames = normalized.filter((v): v is string => Boolean(v));
  const validCount = validNames.length;

  const uniqueSet = new Set(validNames);
  const uniqueCount = uniqueSet.size;

  const duplicateCount = validCount - uniqueCount;

  const freqMap = new Map<string, number>();
  for (const name of validNames) {
    freqMap.set(name, (freqMap.get(name) ?? 0) + 1);
  }

  const topDuplicates = Array.from(freqMap.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);

  console.log("================================");
  console.log("XLSX PROOF RESULT");
  console.log("================================");
  console.log("Total rows in file        :", rawCount);
  console.log("Rows with empty name      :", emptyCount);
  console.log("Rows with valid name      :", validCount);
  console.log("Unique institution names  :", uniqueCount);
  console.log("Duplicate rows skipped    :", duplicateCount);
  console.log("================================");

  console.log("Top duplicated names:");
  for (const [name, count] of topDuplicates) {
    console.log(`- ${name} (${count} rows)`);
  }
}

main().catch((err) => {
  console.error("Proof script failed:");
  console.error(err);
  process.exit(1);
});
