import { sql } from "drizzle-orm";
import { db } from "@/db";

// docker run: docker compose exec backend bun run scripts/update-institution-types.ts

async function main() {
  console.log("Start updating institution_type...");

  // 1. มหาวิทยาลัย -> UNIVERSITY
  await db.execute(sql`
    UPDATE institutions
    SET institutions_type = 'UNIVERSITY'
    WHERE name LIKE 'มหาวิทยาลัย%'
      OR name LIKE 'สถาบัน%'
  `);

  console.log("UNIVERSITY updated");

  // 2. วิทยาลัย -> VOCATIONAL
  await db.execute(sql`
    UPDATE institutions
    SET institutions_type = 'VOCATIONAL'
    WHERE name LIKE 'วิทยาลัย%'
  `);

  console.log("VOCATIONAL updated");

  // 3. โรงเรียน -> SCHOOL
  await db.execute(sql`
    UPDATE institutions
    SET institutions_type = 'SCHOOL'
    WHERE name LIKE 'โรงเรียน%' 
  `);

  console.log("SCHOOL updated");

  // 4. อื่น ๆ -> OTHERS
  await db.execute(sql`
    UPDATE institutions
    SET institutions_type = 'OTHERS'
    WHERE institutions_type IS NULL
  `);

  console.log("OTHERS updated");

  console.log("================================");
  console.log("Institution type update completed");
}

main().catch((err) => {
  console.error("Update failed:");
  console.error(err);
  process.exit(1);
});
