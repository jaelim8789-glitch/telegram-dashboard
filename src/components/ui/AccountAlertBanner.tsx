"use client";



import { useEffect, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import { AlertTriangle, X } from "lucide-react";

import * as api from "@/lib/api";

import { useDashboardStore } from "@/store/useDashboardStore";



export function AccountAlertBanner() {

  const [alerts, setAlerts] = useState<{ id: string; phone: string; issue: string }[]>([]);

  const [dismissed, setDismissed] = useState<string[]>([]);

  const selectedAccountId = useDashboardStore(s => s.selectedAccountId);



  useEffect(() => {

    const check = async () => {

      try {

        const list = await api.fetchAccounts();

        const issues = list.filter((a: any) => a.status === "error" || a.status === "banned" || a.status === "limited")

          .map((a: any) => ({ id: a.id, phone: a.phone, issue: a.status === "banned" ? "차단?? : a.status === "limited" ? "?한?? : "?류" }));

        setAlerts(issues);

      } catch (e) { console.warn('Unhandled error in AccountAlertBanner', e) }

    };

    check();

    const interval = setInterval(check, 30000);

    return () => clearInterval(interval);

  }, []);



  const visible = alerts.filter(a => !dismissed.includes(a.id) && a.id !== selectedAccountId);



  return (

    <AnimatePresence>

      {visible.length > 0 && (

        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}

          className="bg-red-600/90 overflow-hidden">

          <div className="flex items-center justify-between px-4 py-2">

            <div className="flex items-center gap-2 min-w-0">

              <AlertTriangle className="h-4 w-4 text-white shrink-0" />

              <span className="text-xs text-white truncate">{visible[0].phone} ??{visible[0].issue}</span>

              {visible.length > 1 && <span className="text-[10px] text-white/70 shrink-0">??{visible.length - 1}?/span>}

            </div>

            <button onClick={() => setDismissed(prev => [...prev, ...visible.map(v => v.id)])} className="text-white/70 hover:text-white shrink-0"><X className="h-4 w-4" /></button>

          </div>

        </motion.div>

      )}

    </AnimatePresence>

  );

}

