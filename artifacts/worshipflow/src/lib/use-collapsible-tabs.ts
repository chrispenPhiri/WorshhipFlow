import { useLocalStorage } from "@/hooks/use-local-storage";

export function useCollapsibleTabs(storageKey: string, defaultTab: string) {
  const [active, setActive] = useLocalStorage<string>(`wf-tabs:${storageKey}:active`, defaultTab);
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(`wf-tabs:${storageKey}:collapsed`, false);
  return { active, setActive, collapsed, setCollapsed };
}
