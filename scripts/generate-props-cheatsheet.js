#!/usr/bin/env node
/**
 * generate-props-cheatsheet — 주요 UI 컴포넌트의 실제 지원 prop 목록 자동 추출
 *
 * TypeScript 컴파일러 API로 컴포넌트 props 인터페이스를 파싱하여 마크다운 문서 생성.
 *
 * Usage: node scripts/generate-props-cheatsheet.js
 * Output: DOCS/COMPONENT_PROPS.md
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const SRC_DIR = path.join(__dirname, "..", "src");
const OUT_FILE = path.join(__dirname, "..", "DOCS", "COMPONENT_PROPS.md");

// Components to analyze
const TARGETS = [
  { path: "components/ui/Badge.tsx", name: "Badge" },
  { path: "components/ui/Panel.tsx", name: "Panel" },
  { path: "components/ui/Toast.tsx", name: "ToastProvider", exportName: "ToastProvider" },
  { path: "components/ui/StatCard.tsx", name: "StatCard" },
  { path: "components/ui/Modal.tsx", name: "Modal" },
  { path: "components/ui/Toggle.tsx", name: "Toggle" },
  { path: "components/ui/ProgressBar.tsx", name: "ProgressBar" },
  { path: "components/ui/Skeleton.tsx", name: "Skeleton" },
  { path: "components/ui/Tooltip.tsx", name: "Tooltip" },
  { path: "components/ui/Table.tsx", name: "Table" },
  { path: "components/layout/Header.tsx", name: "Header" },
  { path: "components/layout/Sidebar.tsx", name: "Sidebar" },
  { path: "components/layout/ThemeToggle.tsx", name: "ThemeToggle" },
];

function analyzeComponent(filePath, componentName) {
  const fullPath = path.join(SRC_DIR, filePath);
  if (!fs.existsSync(fullPath)) return null;

  const source = fs.readFileSync(fullPath, "utf-8");
  const sourceFile = ts.createSourceFile(fullPath, source, ts.ScriptTarget.Latest, true);

  const result = { name: componentName, file: filePath, props: null };

  function visit(node) {
    // Find the function/component declaration
    if (ts.isFunctionDeclaration(node) && node.name?.text === componentName) {
      const param = node.parameters[0];
      if (param && param.type) {
        result.props = extractPropsFromType(param.type, sourceFile);
      }
    }
    // Also check arrow functions: const X: React.FC<Props> = ...
    if (ts.isVariableDeclaration(node) && node.name.getText() === componentName) {
      const type = node.type;
      if (type && ts.isFunctionTypeNode(type)) {
        const param = type.parameters[0];
        if (param && param.type) {
          result.props = extractPropsFromType(param.type, sourceFile);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return result;
}

function extractPropsFromType(typeNode, sourceFile) {
  const type = sourceFile.getTypeChecker()?.getTypeFromTypeNode(typeNode) || null;
  if (!type) return extractPropsFromTypeNode(typeNode, sourceFile);
  // We can't easily use checker without a program, fallback to node parsing
  return extractPropsFromTypeNode(typeNode, sourceFile);
}

function extractPropsFromTypeNode(node) {
  // Inline type literal: { tone?: string; children: ReactNode }
  if (ts.isTypeLiteralNode(node)) {
    const props = {};
    for (const member of node.members) {
      if (ts.isPropertySignature(member)) {
        const name = member.name.getText();
        const type = member.type ? member.type.getText() : "unknown";
        const required = !member.questionToken;
        const doc = ts.getJSDocTags(member).map(t => t.comment).filter(Boolean).join(" ") || "";
        props[name] = { type, required, doc };
      }
    }
    return props;
  }
  // Interface reference (we'd need full TS program for resolution)
  return null;
}

function analyzeWithProgram() {
  const program = ts.createProgram({
    options: { noEmit: true, strict: true },
    rootNames: TARGETS.map(t => path.join(SRC_DIR, t.path)).filter(p => fs.existsSync(p)),
  });
  const checker = program.getTypeChecker();

  const results = [];

  for (const target of TARGETS) {
    const fullPath = path.join(SRC_DIR, target.path);
    if (!fs.existsSync(fullPath)) {
      results.push({ name: target.name, file: target.path, error: "File not found" });
      continue;
    }

    const sourceFile = program.getSourceFile(fullPath);
    if (!sourceFile) {
      results.push({ name: target.name, file: target.path, error: "Could not parse" });
      continue;
    }

    const exportName = target.exportName || target.name;
    const props = {};

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === exportName) {
        const sig = checker.getSignatureFromDeclaration(node);
        if (!sig) return;
        const params = sig.getParameters();
        if (params.length === 0) return;
        const firstParam = params[0];
        const type = checker.getTypeOfSymbolAtLocation(firstParam, firstParam.valueDeclaration);
        for (const prop of type.getProperties()) {
          const propType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration);
          const declaration = prop.declarations?.[0];
          const required = declaration ? !declaration.questionToken : true;
          props[prop.getName()] = {
            type: checker.typeToString(propType),
            required,
          };
        }
      }
      if (ts.isVariableDeclaration(node) && node.name.getText() === exportName) {
        const symbol = checker.getSymbolAtLocation(node.name);
        if (!symbol) return;
        const decl = symbol.valueDeclaration;
        if (!decl || !ts.isVariableDeclaration(decl) || !decl.initializer) return;
        const type = checker.getTypeAtLocation(decl.initializer);
        const callSignatures = type.getCallSignatures();
        for (const sig of callSignatures) {
          const params = sig.getParameters();
          if (params.length === 0) continue;
          const firstParamType = checker.getTypeOfSymbolAtLocation(params[0], params[0].valueDeclaration);
          for (const prop of firstParamType.getProperties()) {
            const propType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration);
            const declaration = prop.declarations?.[0];
            const required = declaration ? !declaration.questionToken : true;
            props[prop.getName()] = {
              type: checker.typeToString(propType),
              required,
            };
          }
        }
      }
    });

    results.push({ name: target.name, file: target.path, props: Object.keys(props).length > 0 ? props : null });
  }

  return results;
}

function main() {
  console.log("🔍 Generating component props cheatsheet...");

  const results = analyzeWithProgram();

  let md = `# Component Props Reference

> Auto-generated on ${new Date().toISOString().slice(0, 10)}  
> Run \`node scripts/generate-props-cheatsheet.js\` to regenerate.

## Legend

| Symbol | Meaning |
|---|---|
| ✅ Required prop. Pass it or TS will error. |
| 🔸 Optional prop. Can be omitted. |

---

`;

  for (const r of results) {
    md += `## \`${r.name}\`

**File:** \`${r.file}\`

`;
    if (r.error) {
      md += `⚠️ ${r.error}\n\n---\n\n`;
      continue;
    }
    if (!r.props) {
      md += `_No props interface found (check export name or function signature)_\n\n---\n\n`;
      continue;
    }

    const entries = Object.entries(r.props);
    if (entries.length === 0) {
      md += `_No props_\n\n---\n\n`;
      continue;
    }

    md += `| Prop | Type | Required |
|---|---|---|\n`;
    for (const [name, info] of entries) {
      const req = info.required ? "✅" : "🔸";
      md += `| \`${name}\` | \`${info.type}\` | ${req} |\n`;
    }
    md += `\n---\n\n`;
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, md);
  console.log(`✅ Cheatsheet written to ${OUT_FILE}`);
  console.log(`   ${results.length} components analyzed`);
}

main();
