/**
 * Image storage abstraction. Today: Supabase Storage.
 * To move to Cloudflare R2, implement `StorageProvider` and swap `provider` below –
 * nothing else in the app talks to a storage SDK directly.
 */
import { createClient } from "@/lib/supabase/client";

export interface StorageProvider {
  /** Uploads a file under `path` and returns its public URL. */
  upload(path: string, file: Blob, contentType: string): Promise<string>;
  remove(urls: string[]): Promise<void>;
}

const BUCKET = "event-photos";

const supabaseProvider: StorageProvider = {
  async upload(path, file, contentType) {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(error.message);
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  },
  async remove(urls) {
    const supabase = createClient();
    const marker = `/${BUCKET}/`;
    const paths = urls.map((u) => u.split(marker)[1]).filter(Boolean);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  },
};

export const storage: StorageProvider = supabaseProvider;
