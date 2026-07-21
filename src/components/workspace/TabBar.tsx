"use client";

import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Send, Users, FileText, Bot, Search, ScanSearch,
  CalendarClock, UserPlus, Zap, BarChart3, Globe, Folder, Target,
  UserCog, MessageCircle, Workflow, Star, MoreHorizontal,
  Share2, TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { QuickActionSheet } from "./QuickActionSheet";
import { TABS, type TabDef, getAccountDisplayName } from "@/types";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/cn";

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  register: UserPlus,
  send: Send,
  scheduler: CalendarClock,
  group: Users,
  groupsearch: Search,
  linkinspector: ScanSearch,
  templates: FileText,
  autoreply: Bot,
  replymacro: Zap,
  campaigns: Target,
  folders: Folder,
  deliveryanalytics: BarChart3,
  channelhub: Globe,
  team: UserCog,
  profile: UserCog,
  log: FileText,
  guestbot: MessageCircle,
  drafts: FileText,
  triggers: Workflow,
  stars: Bot,
  myai: Bot,
  aireply: MessageCircle,
  aibroadcast: Send,
  aioperations: BarChart3,
  aiopscenter: Bot,
  aiusage: BarChart3,
  referral: Share2,
  operator: Zap,
  styleprofile: FileText,
  growthloop: TrendingUp,
};