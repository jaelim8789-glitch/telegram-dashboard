"use client";



import { useState, useEffect } from "react";

import { Bell, BellOff, Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";



type PushEvent = "broadcast_sent" | "broadcast_failed" | "account_banned" | "account_error" | "queue_empty";



const EVENT_LABELS: Record<PushEvent, string> = {

  broadcast_sent: "발송 ?료",

  broadcast_failed: "발송 ?패",

  account_banned: "계정 차단",

  account_error: "계정 ?류",

  queue_empty: "?기열 ?진",

};



const STORAGE_KEY = "telemon-push-settings";



function loadSettings(): Record<PushEvent, boolean> {

  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {} as Record<PushEvent, boolean>; }

}

function saveSettings(s: Record<PushEvent, boolean>) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { console.warn('Unhandled error in PushSettingsPanel', e) } }



export function PushSettingsPanel() {

  const [settings, setSettings] = useState<Record<PushEvent, boolean>>(() => loadSettings());

  const [saving, setSaving] = useState(false);



  function toggle(event: PushEvent) {

    const next = { ...settings, [event]: !settings[event] };

    setSettings(next);

    saveSettings(next);

  }



  function subscribeAll() {

    setSaving(true);

    const all = Object.fromEntries(Object.keys(EVENT_LABELS).map(k => [k, true])) as Record<PushEvent, boolean>;

    setSettings(all);

    saveSettings(all);

    setTimeout(() => setSaving(false), 500);

  }



  const events = Object.keys(EVENT_LABELS) as PushEvent[];



  return (

    <div className="space-y-3">

      <div className="flex items-center justify-between">

        <p className="text-sm font-semibold text-app-text">?시 ?림</p>

        <button onClick={subscribeAll} disabled={saving} className="text-xs text-app-primary font-medium hover:underline">

          {saving ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "모두 켜기"}

        </button>

      </div>

      <div className="space-y-1">

        {events.map(event => (

          <button key={event} onClick={() => toggle(event)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 hover:bg-app-card-hover transition-colors">

            <span className="text-sm text-app-text">{EVENT_LABELS[event]}</span>

            <div className={cn("h-6 w-11 rounded-full transition-colors flex items-center", settings[event] ? "bg-app-primary" : "bg-app-border")}>

              <div className={cn("h-5 w-5 rounded-full bg-white shadow transition-transform", settings[event] ? "translate-x-5.5" : "translate-x-0.5")} />

            </div>

          </button>

        ))}

      </div>

    </div>

  );

}

