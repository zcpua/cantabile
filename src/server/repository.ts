import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import type { AnyDb, PgDb, D1Db } from "./env";
import * as pg from "@/db/schema.pg";
import * as sqlite from "@/db/schema.sqlite";

// Debug-only connectivity probe: runs one trivial COUNT to confirm the DB
// binding/connection is reachable from the current runtime.
export async function pingDb(db: AnyDb, dbType: "postgres" | "d1") {
  if (dbType === "postgres") {
    const [row] = await (db as PgDb).select({ value: count() }).from(pg.composers);
    return row.value;
  }
  const [row] = await (db as D1Db).select({ value: count() }).from(sqlite.composers);
  return row.value;
}

export async function listComposers(db: AnyDb, dbType: "postgres" | "d1") {
  if (dbType === "postgres") {
    return (db as PgDb).select().from(pg.composers).orderBy(asc(pg.composers.birthYear));
  }
  return (db as D1Db).select().from(sqlite.composers).orderBy(asc(sqlite.composers.birthYear));
}

export async function findComposerBySlug(db: AnyDb, dbType: "postgres" | "d1", slug: string) {
  if (dbType === "postgres") {
    const [row] = await (db as PgDb).select().from(pg.composers).where(eq(pg.composers.slug, slug)).limit(1);
    return row;
  }
  const [row] = await (db as D1Db).select().from(sqlite.composers).where(eq(sqlite.composers.slug, slug)).limit(1);
  return row;
}

export async function listWorks(db: AnyDb, dbType: "postgres" | "d1") {
  if (dbType === "postgres") {
    return (db as PgDb).select().from(pg.works).orderBy(isNull(pg.works.year), asc(pg.works.year));
  }
  return (db as D1Db).select().from(sqlite.works).orderBy(isNull(sqlite.works.year), asc(sqlite.works.year));
}

export async function findWorkBySlug(db: AnyDb, dbType: "postgres" | "d1", slug: string) {
  if (dbType === "postgres") {
    const [row] = await (db as PgDb).select().from(pg.works).where(eq(pg.works.slug, slug)).limit(1);
    return row;
  }
  const [row] = await (db as D1Db).select().from(sqlite.works).where(eq(sqlite.works.slug, slug)).limit(1);
  return row;
}

export async function listPerformances(db: AnyDb, dbType: "postgres" | "d1") {
  if (dbType === "postgres") {
    return (db as PgDb).select().from(pg.performances).orderBy(asc(pg.performances.startsAt));
  }
  return (db as D1Db).select().from(sqlite.performances).orderBy(asc(sqlite.performances.startsAt));
}

export async function listBannerPerformances(db: AnyDb, dbType: "postgres" | "d1", openid: string) {
  if (dbType === "postgres") {
    const rows = await (db as PgDb)
      .select({ perf: pg.performances, createdAt: pg.favorites.createdAt })
      .from(pg.favorites)
      .innerJoin(pg.performances, eq(pg.performances.id, pg.favorites.performanceId))
      .where(eq(pg.favorites.openid, openid))
      .orderBy(desc(pg.favorites.createdAt));
    return rows.map((r) => r.perf);
  }
  const rows = await (db as D1Db)
    .select({ perf: sqlite.performances, createdAt: sqlite.favorites.createdAt })
    .from(sqlite.favorites)
    .innerJoin(sqlite.performances, eq(sqlite.performances.id, sqlite.favorites.performanceId))
    .where(eq(sqlite.favorites.openid, openid))
    .orderBy(desc(sqlite.favorites.createdAt));
  return rows.map((r) => r.perf);
}

export async function listArticles(db: AnyDb, dbType: "postgres" | "d1") {
  if (dbType === "postgres") {
    return (db as PgDb).select().from(pg.articles).orderBy(desc(pg.articles.publishedAt));
  }
  return (db as D1Db).select().from(sqlite.articles).orderBy(desc(sqlite.articles.publishedAt));
}

export async function findArticleBySlug(db: AnyDb, dbType: "postgres" | "d1", slug: string) {
  if (dbType === "postgres") {
    const [row] = await (db as PgDb).select().from(pg.articles).where(eq(pg.articles.slug, slug)).limit(1);
    return row;
  }
  const [row] = await (db as D1Db).select().from(sqlite.articles).where(eq(sqlite.articles.slug, slug)).limit(1);
  return row;
}

export async function findPerformanceById(db: AnyDb, dbType: "postgres" | "d1", id: string) {
  if (dbType === "postgres") {
    const [row] = await (db as PgDb).select().from(pg.performances).where(eq(pg.performances.id, id)).limit(1);
    return row;
  }
  const [row] = await (db as D1Db).select().from(sqlite.performances).where(eq(sqlite.performances.id, id)).limit(1);
  return row;
}

// Insert the user row if absent, leaving an existing row untouched. Used at
// login: WeChat no longer hands us profile info there, so we must not clobber
// a nickname/avatar the user set later via /profile.
export async function ensureUser(
  db: AnyDb,
  dbType: "postgres" | "d1",
  user: { openid: string; unionid?: string | null }
) {
  if (dbType === "postgres") {
    await (db as PgDb)
      .insert(pg.users)
      .values({ openid: user.openid, unionid: user.unionid ?? null })
      .onConflictDoNothing({ target: pg.users.openid });
    return;
  }
  await (db as D1Db)
    .insert(sqlite.users)
    .values({ openid: user.openid, unionid: user.unionid ?? null })
    .onConflictDoNothing({ target: sqlite.users.openid });
}

// Idempotent upsert: keep the latest nickname/avatar from WeChat profile.
export async function upsertUser(
  db: AnyDb,
  dbType: "postgres" | "d1",
  user: { openid: string; unionid?: string | null; nickname?: string | null; avatarUrl?: string | null; avatarFileId?: string | null }
) {
  if (dbType === "postgres") {
    await (db as PgDb)
      .insert(pg.users)
      .values({
        openid: user.openid,
        unionid: user.unionid ?? null,
        nickname: user.nickname ?? null,
        avatarUrl: user.avatarUrl ?? null,
        avatarFileId: user.avatarFileId ?? null,
      })
      .onConflictDoUpdate({
        target: pg.users.openid,
        set: {
          unionid: user.unionid ?? null,
          nickname: user.nickname ?? null,
          avatarUrl: user.avatarUrl ?? null,
          avatarFileId: user.avatarFileId ?? null,
          updatedAt: new Date(),
        },
      });
    return;
  }
  await (db as D1Db)
    .insert(sqlite.users)
    .values({
      openid: user.openid,
      unionid: user.unionid ?? null,
      nickname: user.nickname ?? null,
      avatarUrl: user.avatarUrl ?? null,
      avatarFileId: user.avatarFileId ?? null,
    })
    .onConflictDoUpdate({
      target: sqlite.users.openid,
      set: {
        unionid: user.unionid ?? null,
        nickname: user.nickname ?? null,
        avatarUrl: user.avatarUrl ?? null,
        avatarFileId: user.avatarFileId ?? null,
      },
    });
}

export async function findUser(db: AnyDb, dbType: "postgres" | "d1", openid: string) {
  if (dbType === "postgres") {
    const [row] = await (db as PgDb).select().from(pg.users).where(eq(pg.users.openid, openid)).limit(1);
    return row;
  }
  const [row] = await (db as D1Db).select().from(sqlite.users).where(eq(sqlite.users.openid, openid)).limit(1);
  return row;
}

type CollectionKind = "favorites" | "tickets";

const pgTableFor = (kind: CollectionKind) => (kind === "favorites" ? pg.favorites : pg.tickets);
const sqliteTableFor = (kind: CollectionKind) => (kind === "favorites" ? sqlite.favorites : sqlite.tickets);

export async function listCollection(db: AnyDb, dbType: "postgres" | "d1", openid: string, kind: CollectionKind) {
  if (dbType === "postgres") {
    const t = pgTableFor(kind);
    return (db as PgDb)
      .select({ performanceId: t.performanceId, createdAt: t.createdAt })
      .from(t)
      .where(eq(t.openid, openid))
      .orderBy(desc(t.createdAt));
  }
  const t = sqliteTableFor(kind);
  return (db as D1Db)
    .select({ performanceId: t.performanceId, createdAt: t.createdAt })
    .from(t)
    .where(eq(t.openid, openid))
    .orderBy(desc(t.createdAt));
}

// Returns the joined performance rows in collection order (most recently added first).
export async function listCollectionPerformances(
  db: AnyDb,
  dbType: "postgres" | "d1",
  openid: string,
  kind: CollectionKind
) {
  if (dbType === "postgres") {
    const t = pgTableFor(kind);
    const rows = await (db as PgDb)
      .select({ perf: pg.performances, createdAt: t.createdAt })
      .from(t)
      .innerJoin(pg.performances, eq(pg.performances.id, t.performanceId))
      .where(eq(t.openid, openid))
      .orderBy(desc(t.createdAt));
    return rows.map((r) => r.perf);
  }
  const t = sqliteTableFor(kind);
  const rows = await (db as D1Db)
    .select({ perf: sqlite.performances, createdAt: t.createdAt })
    .from(t)
    .innerJoin(sqlite.performances, eq(sqlite.performances.id, t.performanceId))
    .where(eq(t.openid, openid))
    .orderBy(desc(t.createdAt));
  return rows.map((r) => r.perf);
}

export async function addCollection(
  db: AnyDb,
  dbType: "postgres" | "d1",
  openid: string,
  performanceId: string,
  kind: CollectionKind
) {
  if (dbType === "postgres") {
    const t = pgTableFor(kind);
    await (db as PgDb).insert(t).values({ openid, performanceId }).onConflictDoNothing();
    return;
  }
  const t = sqliteTableFor(kind);
  await (db as D1Db).insert(t).values({ openid, performanceId }).onConflictDoNothing();
}

export async function removeCollection(
  db: AnyDb,
  dbType: "postgres" | "d1",
  openid: string,
  performanceId: string,
  kind: CollectionKind
) {
  if (dbType === "postgres") {
    const t = pgTableFor(kind);
    await (db as PgDb).delete(t).where(and(eq(t.openid, openid), eq(t.performanceId, performanceId)));
    return;
  }
  const t = sqliteTableFor(kind);
  await (db as D1Db).delete(t).where(and(eq(t.openid, openid), eq(t.performanceId, performanceId)));
}
