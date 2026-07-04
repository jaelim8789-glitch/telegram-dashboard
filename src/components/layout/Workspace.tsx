"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useDashboardStore } from "@/store/useDashboardStore";
import { TabBar } from "@/components/workspace/TabBar";
import { AccountRegisterTab } from "@/components/workspace/tabs/AccountRegisterTab";
import { SendTab } from "@/components/workspace/tabs/SendTab";
import { GroupTab } from "@/components/workspace/tabs/GroupTab";
import { AutoReplyTab } from "@/components/workspace/tabs/AutoReplyTab";
import { ProfileTab } from "@/components/workspace/tabs/ProfileTab";
import { LogTab } from "@/components/workspace/tabs/LogTab";
import type { TabId } from "@/types";

const TAB_CONTENT: Record<TabId, React.ComponentType> = {
  register: AccountRegisterTab,
  send: SendTab,
  group: GroupTab,
  autoreply: AutoReplyTab,
  profile: ProfileTab,
  log: LogTab,
};

export function Workspace() {
  const activeTab = useDashboardStore((s) => s.activeTab);
  const ActiveTabContent = TAB_CONTENT[activeTab];

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <TabBar />
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ActiveTabContent />
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
