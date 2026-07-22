import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

/**
 * Photo albums. Albums are owned by a user; private albums are visible only
 * to their owner, and password-protected albums require a soft unlock before
 * their contents are listed (the underlying files are not encrypted — this
 * gates the album grouping, suitable for a self-hosted household).
 */

export interface AlbumDTO {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  coverPhotoId: string | null;
  isPrivate: boolean;
  locked: boolean; // has a password
  favorite: boolean;
  pinned: boolean;
  photoCount: number;
  childCount: number;
  isOwner: boolean;
}

type AlbumRow = Prisma.AlbumGetPayload<{
  include: { _count: { select: { photos: true; children: true } } };
}>;

async function coverFor(album: { id: string; coverPhotoId: string | null }): Promise<string | null> {
  if (album.coverPhotoId) return album.coverPhotoId;
  // Fall back to the most recent photo in the album.
  const first = await prisma.albumPhoto.findFirst({
    where: { albumId: album.id },
    orderBy: { addedAt: "desc" },
    select: { photoId: true },
  });
  return first?.photoId ?? null;
}

export async function toAlbumDTO(row: AlbumRow, userId: string): Promise<AlbumDTO> {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    ownerId: row.ownerId,
    coverPhotoId: await coverFor(row),
    isPrivate: row.isPrivate,
    locked: !!row.passwordHash,
    favorite: row.favorite,
    pinned: row.pinned,
    photoCount: row._count.photos,
    childCount: row._count.children,
    isOwner: row.ownerId === userId,
  };
}

/** Albums a user may see: their own + others' non-private albums. */
export function visibilityWhere(userId: string): Prisma.AlbumWhereInput {
  return { OR: [{ ownerId: userId }, { isPrivate: false }] };
}

export async function listAlbums(userId: string, parentId: string | null): Promise<AlbumDTO[]> {
  const rows = await prisma.album.findMany({
    where: { AND: [visibilityWhere(userId), { parentId }] },
    orderBy: [{ pinned: "desc" }, { name: "asc" }],
    include: { _count: { select: { photos: true, children: true } } },
  });
  return Promise.all(rows.map((r) => toAlbumDTO(r, userId)));
}

export async function hashAlbumPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

/** True if the album is unlocked for this request (no password, or matches). */
export async function isUnlocked(albumId: string, providedPw: string | null): Promise<boolean> {
  const album = await prisma.album.findUnique({ where: { id: albumId }, select: { passwordHash: true } });
  if (!album) return false;
  if (!album.passwordHash) return true;
  if (!providedPw) return false;
  return bcrypt.compare(providedPw, album.passwordHash);
}
