#!/usr/bin/env bash
# Scaffold a new React component with TeleMon conventions
# Usage: bash scripts/scaffold-component.sh <ComponentName> [directory]
# Example: bash scripts/scaffold-component.sh UserAvatar components/ui

set -euo pipefail

NAME="$1"
DIR="${2:-components}"
TARGET="src/$DIR/$NAME"

if [ -z "$NAME" ]; then
  echo "Usage: $0 <ComponentName> [directory]"
  echo "Example: $0 UserAvatar components/ui"
  exit 1
fi

if [ -d "$TARGET" ]; then
  echo "Error: $TARGET already exists"
  exit 1
fi

mkdir -p "$TARGET"

cat > "$TARGET/$NAME.tsx" <<COMPEOF
import React from "react";

interface Props {
  children?: React.ReactNode;
}

export function ({ children }: Props) {
  return (
    <div>
      {children}
    </div>
  );
}
COMPEOF

cat > "$TARGET/index.ts" <<COMPEOF
export {  } from './';
export type { Props } from './';
COMPEOF

cat > "$TARGET/${NAME}.test.tsx" <<COMPEOF
import { render, screen } from '@testing-library/react';
import {  } from './';

describe('', () => {
  it('renders without crashing', () => {
    render(< />);
  });
});
COMPEOF

echo 'Scaffolded  at /'
echo '  - .tsx'
echo '  - index.ts'
echo '  - .test.tsx'
