"use client";



import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDashboardStore } from "@/store/useDashboardStore";

import { useToast } from "@/components/ui/Toast";

import * as api from "@/lib/api";

import * as folderApi from "@/lib/folderApi";

import type { GroupFolder, Group, SmartFolderType, FolderReorderInput } from "@/types";



const FOLDER_COLORS = [

  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",

  "#ec4899", "#f43f5e", "#ef4444", "#f97316",

  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",

  "#3b82f6", "#64748b",

];



const SMART_FOLDER_OPTIONS: { type: SmartFolderType; label: string; icon: string; description: string }[] = [

  { type: "recent_activity", label: "최근 ?동", icon: "?", description: "최근 24?간 ??발송??그룹" },

  { type: "unsent", label: "미발??, icon: "?", description: "??번도 발송?? ?? 그룹" },

  { type: "vip", label: "VIP", icon: "?, description: "?주 발송?는 주요 그룹" },

  { type: "auto_classify", label: "?동 분류", icon: "?", description: "?워??기반 ?동 분류" },

];



const FOLDER_ICONS: Record<string, string> = {

  "folder": "?", "bookmark": "?", "star": "?, "heart": "?️",

  "mail": "?", "bell": "?", "clock": "??, "tag": "??,

  "sparkles": "??, "zap": "??, "crown": "?", "rocket": "??",

};



function getFolderIcon(folder: GroupFolder): string {

  return FOLDER_ICONS[folder.icon] || "?";

}



interface DragItem {

  type: "folder" | "group";

  id: string;

  sourceFolderId?: string;

}



function FolderTreeNode({

  folder,

  groups,

  selectedGroupIds,

  onToggleGroup,

  onDragStart,

  onDragOver,

  onDrop,

  onSendToFolder,

  onDeleteFolder,

  sendMessage,

  depth = 0,

}: {

  folder: GroupFolder;

  groups: Group[];

  selectedGroupIds: Set<string>;

  onToggleGroup: (gid: string) => void;

  onDragStart: (item: DragItem) => void;

  onDragOver: (e: React.DragEvent, folderId: string) => void;

  onDrop: (e: React.DragEvent, targetFolderId: string) => void;

  onSendToFolder: (folderId: string) => void;

  onDeleteFolder: (folderId: string) => void;

  sendMessage: string;

  depth: number;

}) {

  const [collapsed, setCollapsed] = useState(folder.is_collapsed);

  const children = folder.children || [];



  return (

    <div className="select-none">

      <div

        className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-all hover:bg-app-card-hover ${

          depth > 0 ? "ml-6 border-l-2 border-app-border" : ""

        }`}

        style={{ borderLeftColor: depth > 0 ? folder.color : undefined }}

        draggable

        onDragStart={(e) => {

          e.dataTransfer.setData("text/plain", JSON.stringify({ type: "folder", id: folder.id }));

          onDragStart({ type: "folder", id: folder.id });

        }}

        onDragOver={(e) => onDragOver(e, folder.id)}

        onDrop={(e) => onDrop(e, folder.id)}

      >

        {/* Collapse toggle for folders with children */}

        {children.length > 0 && (

          <button

            onClick={() => setCollapsed(!collapsed)}

            className="text-app-text-subtle hover:text-app-text transition-colors"

          >

            {collapsed ? "?? : "??}

          </button>

        )}

        {children.length === 0 && <span className="w-3" />}



        {/* Folder icon */}

        <span className="text-lg">{getFolderIcon(folder)}</span>



        {/* Smart folder badge */}

        {folder.is_smart && (

          <span className="rounded-full bg-green-900/40 px-1.5 py-0.5 text-[10px] text-green-400">

            SMART

          </span>

        )}



        {/* Folder name */}

        <span className="flex-1 truncate font-medium text-app-text">{folder.name}</span>



        {/* Group count */}

        <span className="text-xs text-app-text-subtle">{folder.group_ids.length}?/span>



        {/* Actions */}

        <div className="hidden gap-1 group-hover:flex">

          <button

            onClick={() => onSendToFolder(folder.id)}

            disabled={folder.group_ids.length === 0 || !sendMessage.trim()}

            className="rounded p-1 text-xs text-app-text-muted hover:bg-app-card-hover hover:text-app-text disabled:opacity-30"

            title="?더 발송"

          >

            ?

          </button>

          <button

            onClick={() => onDeleteFolder(folder.id)}

            className="rounded p-1 text-xs text-app-text-subtle hover:bg-red-900/30 hover:text-red-400"

            title="??"

          >

            ??
          </button>

        </div>



        {/* Color bar */}

        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: folder.color }} />

      </div>



      {/* Children */}

      {!collapsed && children.length > 0 && (

        <div className="mt-1 space-y-1">

          {children.map((child) => (

            <FolderTreeNode

              key={child.id}

              folder={child}

              groups={groups}

              selectedGroupIds={selectedGroupIds}

              onToggleGroup={onToggleGroup}

              onDragStart={onDragStart}

              onDragOver={onDragOver}

              onDrop={onDrop}

              onSendToFolder={onSendToFolder}

              onDeleteFolder={onDeleteFolder}

              sendMessage={sendMessage}

              depth={depth + 1}

            />

          ))}

        </div>

      )}



      {/* Groups inside this folder */}

      {!collapsed && folder.group_ids.length > 0 && (

        <div className={`ml-${depth > 0 ? "12" : "6"} mt-1 space-y-0.5`}>

          {folder.group_ids.map((gid) => {

            const group = groups.find((g) => g.id === gid);

            return (

              <label

                key={gid}

                className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm text-app-text hover:bg-app-card-hover transition-colors"

                draggable

                onDragStart={(e) => {

                  e.dataTransfer.setData("text/plain", JSON.stringify({

                    type: "group", id: gid, sourceFolderId: folder.id,

                  }));

                }}

                onDragOver={(e) => e.preventDefault()}

                onDrop={(e) => {

                  e.preventDefault();

                  try {

                    const data: DragItem = JSON.parse(e.dataTransfer.getData("text/plain"));

                    if (data.type === "group" && data.id !== gid) {

                      // Group reorder within folder handled by backend batch move

                    }

                  } catch (e) { console.warn('Unhandled error in FoldersTab', e) }

                }}

              >

                <input

                  type="checkbox"

                  checked={selectedGroupIds.has(gid)}

                  onChange={() => onToggleGroup(gid)}

                  className="rounded border-app-border-strong bg-app-bg text-indigo-600"

                />

                <span className="truncate">{group?.title ?? `Group ${gid.slice(0, 8)}`}</span>

              </label>

            );

          })}

        </div>

      )}

    </div>

  );

}



export function FoldersTab() {

  const { toast } = useToast();

  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);

  const [folders, setFolders] = useState<GroupFolder[]>([]);

  const [treeView, setTreeView] = useState(true);

  const [groups, setGroups] = useState<Group[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);

  const [newFolderName, setNewFolderName] = useState("");

  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);

  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  const [sendMessage, setSendMessage] = useState("");

  const [sendingFolderIds, setSendingFolderIds] = useState<Set<string>>(new Set());

  const [syncLoading, setSyncLoading] = useState(false);

  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const [smartFolderOpen, setSmartFolderOpen] = useState(false);

  const [editingFolder, setEditingFolder] = useState<GroupFolder | null>(null);



  const accountId = selectedAccountId ?? "";



  const loadFolders = useCallback(async () => {

    if (!accountId) return;

    setLoading(true);

    setError(null);

    try {

      const [folderData, groupData] = await Promise.all([

        folderApi.fetchFolders(accountId, true),

        api.fetchGroups(accountId),

      ]);

      setFolders(folderData);

      setGroups(groupData);

    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to load folders");

    } finally {

      setLoading(false);

    }

  }, [accountId]);



  useEffect(() => { loadFolders(); }, [loadFolders]);



  // Flatten folders for dropdown selections

  const flatFolders = useMemo(() => {

    const flatten = (items: GroupFolder[]): GroupFolder[] => {

      const result: GroupFolder[] = [];

      for (const item of items) {

        result.push(item);

        if (item.children) result.push(...flatten(item.children));

      }

      return result;

    };

    return flatten(folders);

  }, [folders]);



  const getGroupTitle = useCallback((groupId: string): string => {

    return groups.find((g) => g.id === groupId)?.title ?? `Group ${groupId.slice(0, 8)}`;

  }, [groups]);



  // ?? CRUD Operations ??



  const handleCreateFolder = async () => {

    if (!accountId || !newFolderName.trim()) return;

    try {

      await folderApi.createFolder(accountId, {

        name: newFolderName.trim(),

        color: newFolderColor,

        icon: "folder",

        parent_id: newFolderParentId,

      });

      setNewFolderName("");

      setNewFolderParentId(null);

      setIsCreating(false);

      await loadFolders();

    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to create folder");

    }

  };



  const handleCreateSmartFolder = async (type: SmartFolderType) => {

    if (!accountId) return;

    try {

      await folderApi.createSmartFolder(accountId, {

        name: SMART_FOLDER_OPTIONS.find(o => o.type === type)?.label ?? type,

        smart_type: type,

        color: "#22c55e",

        icon: "sparkles",

      });

      setSmartFolderOpen(false);

      await loadFolders();

    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to create smart folder");

    }

  };



  const handleDeleteFolder = async (folderId: string) => {

    if (!accountId) return;

    try {

      await folderApi.deleteFolder(accountId, folderId);

      await loadFolders();

    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to delete folder");

    }

  };



  const handleBatchMove = async (targetFolderId: string | null) => {

    if (!accountId || selectedGroupIds.size === 0) return;

    try {

      await folderApi.batchMoveGroups(accountId, {

        group_ids: Array.from(selectedGroupIds),

        target_folder_id: targetFolderId ?? undefined,

      });

      setSelectedGroupIds(new Set());

      await loadFolders();

    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to move groups");

    }

  };



  const handleSendToFolder = async (folderId: string) => {

    if (!accountId || !sendMessage.trim()) return;

    setSendingFolderIds(new Set([folderId]));

    try {

      const result = await folderApi.sendToFolders(accountId, {

        folder_ids: [folderId],

        message: sendMessage.trim(),

      });

      if (result.sent_count > 0) {

        setSendMessage("");

      }

      toast("success", `??${result.sent_count}?그룹??메시지 발송 ?료`);

    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to send");

    } finally {

      setSendingFolderIds(new Set());

    }

  };



  const handleSendToAllFolders = async () => {

    if (!accountId || !sendMessage.trim() || folders.length === 0) return;

    const allFolderIds = flatFolders.map(f => f.id);

    setSendingFolderIds(new Set(allFolderIds));

    try {

      const result = await folderApi.sendToFolders(accountId, {

        folder_ids: allFolderIds,

        message: sendMessage.trim(),

      });

      if (result.sent_count > 0) setSendMessage("");

      toast("success", `??${result.sent_count}?그룹??메시지 발송 ?료`);

    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to send");

    } finally {

      setSendingFolderIds(new Set());

    }

  };



  const handleSyncTelegram = async () => {

    if (!accountId) return;

    setSyncLoading(true);

    try {

      await folderApi.syncTelegramFolders(accountId);

      await loadFolders();

    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to sync");

    } finally {

      setSyncLoading(false);

    }

  };



  // ?? Drag & Drop ??



  const dragItemRef = useRef<DragItem | null>(null);



  const handleDragStart = useCallback((item: DragItem) => {

    dragItemRef.current = item;

  }, []);



  const handleDragOver = useCallback((e: React.DragEvent, folderId: string) => {

    e.preventDefault();

    e.stopPropagation();

    setDragOverFolderId(folderId);

  }, []);



  const handleDrop = useCallback(async (e: React.DragEvent, targetFolderId: string) => {

    e.preventDefault();

    setDragOverFolderId(null);

    const dragItem = dragItemRef.current;

    if (!dragItem || !accountId) return;



    try {

      if (dragItem.type === "folder") {

        // Reorder: move folder under target (or to root)

        const reorderInputs: FolderReorderInput[] = [];

        const targetFolder = flatFolders.find(f => f.id === targetFolderId);

        const targetIsRoot = targetFolder?.parent_id === null || !targetFolder?.parent_id;

        reorderInputs.push({

          folder_id: dragItem.id,

          order: targetIsRoot ? flatFolders.length : (targetFolder?.order ?? 0) + 1,

          parent_id: targetIsRoot ? null : targetFolder?.parent_id ?? null,

        });

        await folderApi.reorderFolders(accountId, reorderInputs);

        await loadFolders();

      } else if (dragItem.type === "group") {

        // Move group to target folder

        await folderApi.batchMoveGroups(accountId, {

          source_folder_id: dragItem.sourceFolderId,

          target_folder_id: targetFolderId,

          group_ids: [dragItem.id],

        });

        await loadFolders();

      }

    } catch (err) {

      setError(err instanceof Error ? err.message : "Drag & drop failed");

    }

  }, [accountId, flatFolders, loadFolders]);



  const toggleGroupSelection = useCallback((groupId: string) => {

    setSelectedGroupIds((prev) => {

      const next = new Set(prev);

      if (next.has(groupId)) next.delete(groupId);

      else next.add(groupId);

      return next;

    });

  }, []);



  if (!accountId) {

    return (

      <div className="flex h-full items-center justify-center text-app-text-muted">

        계정???택?주?요

      </div>

    );

  }



  return (

    <div className="mx-auto max-w-6xl space-y-6">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-xl font-bold text-app-text">? ?더 관?/h2>

          <p className="text-sm text-app-text-muted">

            ?래????롭?로 ?더/그룹 ?동 · 계층 구조 · ?마???더

          </p>

        </div>

        <div className="flex gap-2">

          <button

            onClick={() => setTreeView(!treeView)}

            className="rounded-lg border border-app-border px-3 py-1.5 text-sm text-app-text hover:bg-app-card-hover"

            title={treeView ? "리스??? : "?리 ?}

          >

            {treeView ? "?" : "?"}

          </button>

          <button

            onClick={handleSyncTelegram}

            disabled={syncLoading}

            className="rounded-lg border border-app-border px-3 py-1.5 text-sm text-app-text hover:bg-app-card-hover disabled:opacity-50"

          >

            {syncLoading ? "? ?기???.." : "? ?레그램 ?기??}

          </button>

          <button

            onClick={() => setSmartFolderOpen(true)}

            className="rounded-lg border border-green-700 px-3 py-1.5 text-sm text-green-400 hover:bg-green-900/30"

          >

            ???마???더

          </button>

          <button

            onClick={() => setIsCreating(true)}

            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"

          >

            + ???더

          </button>

        </div>

      </div>



      {error && (

        <div className="rounded-lg bg-red-900/30 p-3 text-sm text-red-400">

          {error}

          <button onClick={() => setError(null)} className="ml-2 underline">?기</button>

        </div>

      )}



      {/* Create Folder Modal */}

      {isCreating && (

        <div className="rounded-xl border border-app-border bg-app-card p-4">

          <h3 className="mb-3 font-semibold text-app-text">???더 ?성</h3>

          <div className="space-y-3">

            <input

              type="text"

              value={newFolderName}

              onChange={(e) => setNewFolderName(e.target.value)}

              placeholder="?더 ?름???력?세??

              aria-label="???더 ?름"

              className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-text placeholder-app-text-muted focus:border-indigo-500 focus:outline-none"

              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}

              autoFocus

            />

            {/* Parent folder selection */}

            <select

              value={newFolderParentId ?? ""}

              onChange={(e) => setNewFolderParentId(e.target.value || null)}

              aria-label="?위 ?더 ?택"

              className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-text"

            >

              <option value="">최상???더</option>

              {flatFolders.map((f) => (

                <option key={f.id} value={f.id}>

                  {getFolderIcon(f)} {f.name}

                </option>

              ))}

            </select>

            <div className="flex flex-wrap gap-1">

              {FOLDER_COLORS.map((color) => (

                <button

                  key={color}

                  type="button"

                  onClick={() => setNewFolderColor(color)}

                  aria-label={`?더 ?상 ${color}`}

                  className={`h-6 w-6 rounded-full border-2 ${

                    newFolderColor === color ? "border-white" : "border-transparent"

                  }`}

                  style={{ backgroundColor: color }}

                />

              ))}

            </div>

            <div className="flex gap-2">

              <button

                onClick={handleCreateFolder}

                disabled={!newFolderName.trim()}

                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"

              >

                ?성

              </button>

              <button

                onClick={() => { setIsCreating(false); setNewFolderName(""); setNewFolderParentId(null); }}

                className="rounded-lg bg-app-card px-4 py-1.5 text-sm text-app-text hover:bg-app-card-hover"

              >

                취소

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Smart Folder Modal */}

      {smartFolderOpen && (

        <div className="rounded-xl border border-green-700 bg-app-card p-4">

          <div className="mb-3 flex items-center justify-between">

            <h3 className="font-semibold text-app-text">???마???더 ?성</h3>

            <button onClick={() => setSmartFolderOpen(false)} className="text-app-text-muted hover:text-app-text">??/button>

          </div>

          <div className="grid gap-3 sm:grid-cols-2">

            {SMART_FOLDER_OPTIONS.map((opt) => (

              <button

                key={opt.type}

                onClick={() => handleCreateSmartFolder(opt.type)}

                className="flex items-start gap-3 rounded-lg border border-app-border bg-app-bg-hover p-3 text-left hover:border-green-700 hover:bg-app-card transition-all"

              >

                <span className="text-2xl">{opt.icon}</span>

                <div>

                  <div className="font-medium text-app-text">{opt.label}</div>

                  <div className="text-xs text-app-text-muted">{opt.description}</div>

                </div>

              </button>

            ))}

          </div>

        </div>

      )}



      {/* Batch Move Bar */}

      {selectedGroupIds.size > 0 && (

        <div className="rounded-xl border border-indigo-700 bg-indigo-900/30 p-3">

          <div className="flex items-center gap-3 flex-wrap">

            <span className="text-sm text-indigo-300">

              {selectedGroupIds.size}?그룹 ?택??
            </span>

            <select

              className="rounded border border-app-border bg-app-card px-2 py-1 text-sm text-app-text"

              defaultValue=""

              aria-label="?동???더 ?택"

              onChange={(e) => {

                if (e.target.value) handleBatchMove(e.target.value);

              }}

            >

              <option value="" disabled>?동???더 ?택...</option>

              {flatFolders.map((f) => (

                <option key={f.id} value={f.id}>{getFolderIcon(f)} {f.name}</option>

              ))}

            </select>

            <button

              onClick={() => handleBatchMove(null)}

              className="text-sm text-app-text-muted underline hover:text-app-text"

            >

              분류 ?제

            </button>

            <button

              onClick={() => setSelectedGroupIds(new Set())}

              className="ml-auto text-sm text-app-text-muted underline hover:text-app-text"

            >

              ?택 ?제

            </button>

          </div>

        </div>

      )}



      {/* Send Bar */}

      <div className="rounded-xl border border-app-border bg-app-card/50 p-3">

        <div className="flex items-center gap-3">

          <input

            type="text"

            value={sendMessage}

            onChange={(e) => setSendMessage(e.target.value)}

            placeholder="?더 ?위 발송??메시지 ?력 (?더???? 버튼?로 개별 발송)..."

            aria-label="발송??메시지 ?력"

            className="flex-1 rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-text placeholder-app-text-muted focus:border-indigo-500 focus:outline-none"

            onKeyDown={(e) => {

              if (e.key === "Enter" && sendMessage.trim()) {

                handleSendToAllFolders();

              }

            }}

          />

          <button

            onClick={handleSendToAllFolders}

            disabled={!sendMessage.trim() || folders.length === 0}

            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"

          >

            ? ?체 ?더 발송

          </button>

        </div>

      </div>



      {/* Loading State */}

      {loading && (

        <div className="flex justify-center py-12">

          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />

        </div>

      )}



      {/* Folder Tree/List */}

      {!loading && (

        <div

          className="space-y-2 rounded-xl border border-app-border bg-app-card/50 p-4"

          onDragOver={(e) => e.preventDefault()}

          onDrop={async (e) => {

            e.preventDefault();

            // Drop at root level

            const dragItem = dragItemRef.current;

            if (dragItem && dragItem.type === "folder" && accountId) {

              try {

                await folderApi.reorderFolders(accountId, [{

                  folder_id: dragItem.id,

                  order: flatFolders.length,

                  parent_id: null,

                }]);

                await loadFolders();

              } catch (e) { console.warn('Unhandled error in FoldersTab', e) }

            }

          }}

        >

          {treeView ? (

            // Tree View

            folders.length === 0 ? (

              <div className="py-12 text-center text-app-text-subtle">

                <div className="mb-2 text-4xl">?</div>

                <p>?더가 ?습?다. &ldquo;???더&rdquo; 버튼?로 ?더??성?세??</p>

                <p className="mt-1 text-sm">

                  ?는 &ldquo;?레그램 ?기??rdquo;?Telegram???더?가?올 ???습?다.

                </p>

              </div>

            ) : (

              folders.map((folder) => (

                <FolderTreeNode

                  key={folder.id}

                  folder={folder}

                  groups={groups}

                  selectedGroupIds={selectedGroupIds}

                  onToggleGroup={toggleGroupSelection}

                  onDragStart={handleDragStart}

                  onDragOver={handleDragOver}

                  onDrop={handleDrop}

                  onSendToFolder={handleSendToFolder}

                  onDeleteFolder={handleDeleteFolder}

                  sendMessage={sendMessage}

                  depth={0}

                />

              ))

            )

          ) : (

            // Grid View (flat)

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {flatFolders.map((folder) => (

                <div

                  key={folder.id}

                  className={`rounded-xl border border-app-border bg-app-card/80 p-4 transition-all hover:border-app-border-strong ${

                    dragOverFolderId === folder.id ? "border-indigo-500 bg-indigo-900/20" : ""

                  }`}

                  onDragOver={(e) => handleDragOver(e, folder.id)}

                  onDrop={(e) => handleDrop(e, folder.id)}

                >

                  <div className="mb-3 flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <span className="text-lg">{getFolderIcon(folder)}</span>

                      {folder.is_smart && (

                        <span className="rounded bg-green-900/40 px-1 text-[10px] text-green-400">SMART</span>

                      )}

                      <span className="font-medium text-app-text">{folder.name}</span>

                    </div>

                    <div className="flex gap-1">

                      <button

                        onClick={() => handleSendToFolder(folder.id)}

                        disabled={!sendMessage.trim() || folder.group_ids.length === 0}

                        className="rounded p-1 text-app-text-muted hover:bg-app-card-hover hover:text-app-text disabled:opacity-30"

                        title="?더 발송"

                      >

                        ?

                      </button>

                      <button

                        onClick={() => handleDeleteFolder(folder.id)}

                        className="rounded p-1 text-app-text-subtle hover:bg-red-900/30 hover:text-red-400"

                        title="??"

                      >

                        ??
                      </button>

                    </div>

                  </div>



                  <div className="mb-2 text-xs text-app-text-subtle">

                    {folder.parent_id ? "?위 ?더" : "최상???더"} · {folder.group_ids.length}?그룹

                  </div>



                  <div className="max-h-32 space-y-0.5 overflow-y-auto">

                    {folder.group_ids.length === 0 ? (

                      <div className="py-2 text-center text-xs text-app-text-subtle">그룹 ?음</div>

                    ) : (

                      folder.group_ids.map((gid) => (

                        <label

                          key={gid}

                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-app-text hover:bg-app-card-hover"

                        >

                          <input

                            type="checkbox"

                            checked={selectedGroupIds.has(gid)}

                            onChange={() => toggleGroupSelection(gid)}

                  className="rounded border-app-border-strong bg-app-bg text-indigo-600"

                          />

                          <span className="truncate">{getGroupTitle(gid)}</span>

                        </label>

                      ))

                    )}

                  </div>



                  <div className="mt-3 h-1 rounded-full" style={{ backgroundColor: folder.color }} />

                </div>

              ))}



              {flatFolders.length === 0 && (

                <div className="col-span-full py-12 text-center text-app-text-subtle">

                  <div className="mb-2 text-4xl">?</div>

                  <p>?더가 ?습?다.</p>

                </div>

              )}

            </div>

          )}

        </div>

      )}



      {/* Summary */}

      {!loading && flatFolders.length > 0 && (

        <div className="flex items-center gap-4 text-xs text-app-text-subtle">

          <span>? ?{flatFolders.length}??더</span>

          <span>? {folders.length}?루트 ?더</span>

          <span>? {groups.length}?그룹</span>

          <span>??{flatFolders.filter(f => f.is_smart).length}??마???더</span>

          <span>? {selectedGroupIds.size}??택??/span>

        </div>

      )}

    </div>

  );

}