# Backend Infrastructure Optimizations

Backend lives in a **separate repo** (`telegram-dashboard-backend.git`) as a git submodule.

## Watchfiles (uvicorn --reload speed)

Install `watchfiles` to speed up uvicorn hot-reload (~2x faster file watching):

```bash
cd telegram-dashboard-backend
pip install watchfiles
# uvicorn automatically uses watchfiles if installed
```

No code changes needed ? uvicorn picks it up automatically.

## pip Wheel Cache (CI)

Add this to `.github/workflows/` (backend repo):

```yaml
- name: pip wheel cache
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-${{ hashFiles('requirements.txt') }}-${{ runner.os }}
    restore-keys: |
      pip-${{ runner.os }}-
```

For faster installs, use `pip wheel --wheel-dir` to pre-build wheels:

```bash
pip wheel --wheel-dir .wheels -r requirements.txt
pip install --no-index --find-links .wheels -r requirements.txt
```

## pnpm Store (Frontend CI)

Already configured in `deploy.yml` via `actions/cache` for `node_modules`.

Key: `node-modules-${{ hashFiles('pnpm-lock.yaml') }}-${{ runner.os }}`
