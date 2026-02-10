import { and, count, eq } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { ConflictError, ForbiddenError } from "@/common/exceptions";
import { isObject, isPostgresError } from "@/common/utils/type-guard";
import { db } from "@/db";
import { favorites, internshipPositions, users } from "@/db/schema";
import type * as model from "./model";

export class FavoriteService {
  private async assertUserExists(userId: string) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new ForbiddenError("ไม่พบผู้ใช้งานในระบบ");
  }
  /**
   * GET /favorite
   * เห็นเฉพาะ favorites ของ user ที่ login อยู่
   */
  async findMyFavorites(userId: string, query: model.GetFavoritesQueryType) {
    await this.assertUserExists(userId);
    const { page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const whereClause = eq(favorites.userId, userId);

    // คืนทั้ง row favorites + รายละเอียด position (เผื่อเอาไปแสดงหน้า UI ได้เลย)
    const data = await db
      .select({
        favorite: favorites,
        position: internshipPositions,
      })
      .from(favorites)
      .innerJoin(
        internshipPositions,
        eq(internshipPositions.id, favorites.positionId)
      )
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(favorites.id);

    const [totalResult] = await db
      .select({ count: count() })
      .from(favorites)
      .where(whereClause);

    const total = Number(totalResult.count);
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;

    return { data, meta: { total, page, limit, totalPages, hasNextPage } };
  }

  /**
   * POST /favorite
   * กด favorite -> สร้าง row ใหม่ (unique: user_id + position_id)
   */
  async create(userId: string, data: model.CreateFavoriteBodyType) {
    await this.assertUserExists(userId);
    try {
      const [created] = await db
        .insert(favorites)
        .values({
          userId,
          positionId: data.positionId,
        })
        .returning();

      return created;
    } catch (error: unknown) {
      const err = isObject(error) && "cause" in error ? error.cause : error;

      // unique violation
      if (isPostgresError(err) && err.code === "23505") {
        throw new ConflictError("คุณได้กด favorite ตำแหน่งนี้ไว้แล้ว");
      }

      throw error;
    }
  }

  /**
   * DELETE /favorite/:positionId
   * เอาออกจาก favorites (ลบ row ที่ userId + positionId)
   */
  async delete(userId: string, positionId: number) {
    await this.assertUserExists(userId);
    const [deleted] = await db
      .delete(favorites)
      .where(
        and(eq(favorites.userId, userId), eq(favorites.positionId, positionId))
      )
      .returning();

    if (!deleted) {
      throw new NotFoundError("ไม่พบรายการ favorite ที่ต้องการลบ");
    }

    return { success: true, message: "ลบ favorite เรียบร้อยแล้ว" };
  }
}
