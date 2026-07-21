export function exportCSV(headers: string[], rows: string[][], filename: string) {
  const bom = "\uFEFF";
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  download(`${bom}${csv}`, `${filename}.csv`, "text/csv;charset=utf-8");
}

export function exportJSON(data: unknown, filename: string) {
  download(JSON.stringify(data, null, 2), `${filename}.json`, "application/json");
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject("No file selected");
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve(JSON.parse(reader.result as string)); }
        catch { reject("Invalid JSON file"); }
      };
      reader.onerror = () => reject("File read error");
      reader.readAsText(file);
    };
    input.click();
  });
}

export async function backupData(key: string, filename: string) {
  try {
    const data: Record<string, unknown> = {};
    const allKeys = Object.keys(localStorage).filter((k) => k.startsWith(key));
    for (const k of allKeys) {
      try { data[k] = JSON.parse(localStorage.getItem(k) ?? "null"); }
      catch { data[k] = localStorage.getItem(k); }
    }
    exportJSON(data, filename);
    return allKeys.length;
  } catch { return 0; }
}

export async function restoreData(key: string): Promise<number> {
  try {
    const data = await importJSON() as Record<string, unknown>;
    let count = 0;
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith(key)) {
        localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
        count++;
      }
    }
    return count;
  } catch { return 0; }
}

export async function captureElementAsPNG(_elementId: string, _filename: string) {
  console.warn("PNG capture requires html2canvas package - install with: npm install html2canvas");
}
