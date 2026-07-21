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

export async function captureElementAsPNG(_elementId: string, _filename: string) {
  console.warn("PNG capture requires html2canvas package - install with: npm install html2canvas");
}
