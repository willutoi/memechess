import { PrismaClient } from '@prisma/client';

let prismaInstance;

if (process.env.NODE_ENV === 'production') {
  prismaInstance = new PrismaClient();
} else {
  if (!global.globalPrisma) {
    global.globalPrisma = new PrismaClient();
  }
  prismaInstance = global.globalPrisma;
}

let dbInitPromise = null;

export async function getPrisma() {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      // Auto-create SQLite tables at runtime if using SQLite on serverless
      const isSqlite = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('file:');
      if (isSqlite) {
        try {
          await prismaInstance.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "User" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "username" TEXT NOT NULL UNIQUE,
              "meme_coins" INTEGER NOT NULL DEFAULT 500,
              "elo" INTEGER NOT NULL DEFAULT 1200,
              "wins" INTEGER NOT NULL DEFAULT 0,
              "losses" INTEGER NOT NULL DEFAULT 0,
              "games_played" INTEGER NOT NULL DEFAULT 0,
              "active_skin_pack" TEXT NOT NULL DEFAULT 'classic',
              "active_audio_pack" TEXT NOT NULL DEFAULT 'default',
              "owned_items" TEXT NOT NULL DEFAULT 'classic,default',
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
          await prismaInstance.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "ShopItem" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "pack_name" TEXT NOT NULL UNIQUE,
              "price" INTEGER NOT NULL,
              "type" TEXT NOT NULL
            );
          `);
          console.log("SQLite tables successfully verified/created at runtime!");
        } catch (e) {
          console.error("Failed to auto-init SQLite tables at runtime:", e);
        }
      }
    })();
  }
  await dbInitPromise;
  return prismaInstance;
}
