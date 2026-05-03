import { useLocalStorage } from "@/hooks/use-local-storage";

const STORAGE_KEY = "wf-bible-only-mode";

export const BIBLE_ONLY_ALLOWED_PATHS: readonly string[] = ["/", "/settings"];

export function useBibleOnlyMode() {
  const [enabled, setEnabled] = useLocalStorage<boolean>(STORAGE_KEY, false);
  return { enabled, setEnabled };
}

export function isPathAllowedInBibleOnly(path: string): boolean {
  return BIBLE_ONLY_ALLOWED_PATHS.includes(path);
}
