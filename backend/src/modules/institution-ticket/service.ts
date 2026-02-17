import { eq } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { db } from "@/db";
import { institutions } from "@/db/schema";

export class InstitutionTicketService {
  async findById(id: number) {
    const [row] = await db
      .select({
        id: institutions.id,
        institutionsType: institutions.institutionsType,
        name: institutions.name,
      })
      .from(institutions)
      .where(eq(institutions.id, id))
      .limit(1);

    if (!row) throw new NotFoundError(`ไม่พบสถาบันรหัส ${id}`);
    return row;
  }
}
