import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { db } from "@/db";
import { institutions } from "@/db/schema";

// required: bun add xlsx
// docker run: docker compose exec backend bun run scripts/import-institutions.ts --file schools_list.xlsx

/**
 * ทำความสะอาดชื่อสถาบันให้ไม่มีตัวอักษรพิเศษ
 */
function normalizeName(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s ? s : null;
}

async function main() {
  /**
   * รับชื่อไฟล์จาก argument
   */
  const fileArgIndex = process.argv.indexOf("--file");
  const fileName = fileArgIndex >= 0 ? process.argv[fileArgIndex + 1] : null;

  if (!fileName) {
    console.error(
      "Usage: bun run scripts/import-schools.ts --file schools.xlsx"
    );
    process.exit(1);
  }

  if (!fileName.endsWith(".xlsx")) {
    console.error("Only .xlsx files are allowed");
    process.exit(1);
  }

  /**
   * path ของโฟลเดอร์ xlsx_files
   */
  const XLSX_DIR = path.resolve(process.cwd(), "xlsx_files");
  const filePath = path.join(XLSX_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  console.log("Reading file:", filePath);

  /**
   * อ่านไฟล์ Excel
   */
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  /**
   * แปลง sheet -> JSON
   */
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
    raw: false,
  });

  /**
   * ดึงเฉพาะ school_name
   */
  const names = rows
    .map((row) => normalizeName(row.school_name))
    .filter((x): x is string => Boolean(x));

  const uniqueNames = Array.from(new Set(names));

  if (uniqueNames.length === 0) {
    console.log("No data found in column: school_name");
    return;
  }

  console.log(`Found ${uniqueNames.length} unique school names`);

  /**
   * Insert แบบ batch
   */
  const BATCH_SIZE = 500;
  let insertedTotal = 0;

  for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
    const chunk = uniqueNames.slice(i, i + BATCH_SIZE);

    const inserted = await db
      .insert(institutions)
      .values(
        chunk.map((name) => ({
          name,
          // institutions_type ปล่อยเป็น NULL
        }))
      )
      .onConflictDoNothing()
      .returning({ id: institutions.id });

    insertedTotal += inserted.length;

    console.log(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1}: inserted ${inserted.length}/${chunk.length}`
    );
  }

  console.log("================================");
  console.log("Import completed");
  console.log("Total unique names:", uniqueNames.length);
  console.log("Inserted rows:", insertedTotal);
}

main().catch((err) => {
  console.error("Import failed:");
  console.error(err);
  process.exit(1);
});
