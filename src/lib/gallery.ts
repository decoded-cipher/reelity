import type { GalleryItem } from "./types";

export async function fetchGallery(offset = 0, limit = 24): Promise<GalleryItem[]> {
  try {
    const res = await fetch(`/api/gallery?offset=${offset}&limit=${limit}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: GalleryItem[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}
