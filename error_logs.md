# Error Logs — Sahya Code Bug Report

Generated: 2026-04-02

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1     |
| High     | 2     |
| Medium   | 3     |
| Low      | 4     |
| **Total**| **10**|

---

## CRITICAL

### BUG-001 — Uninitialized `returncode` variable in worker.py

- **File**: `src/sahya_code/background/worker.py`
- **Lines**: ~155–208
- **Severity**: CRITICAL
- **Description**: The variable `returncode` is only assigned inside a `try` block, inside conditional branches. If an exception is raised before any of those branches execute (i.e., before line ~155/158/164/170), the `except` handler returns early — which is safe. However, if there is a code path where the exception is caught but execution continues past the `try/except/finally`, `returncode` will be accessed uninitialized at lines ~192, 203, and 208, causing an `UnboundLocalError` at runtime.
- **Root Cause**: No default initialization of `returncode` before the `try` block (e.g., `returncode = None`).
- **Problematic Code**:
```python
# No initialization of returncode before the try block
try:
    # ...
    if spec.timeout_s is None:
        returncode = await process.wait()          # Only assigned if no exception
    else:
        try:
            returncode = await asyncio.wait_for(process.wait(), timeout=spec.timeout_s)
        except asyncio.TimeoutError:
            returncode = ...                       # assigned in timeout handler
except Exception as exc:
    return   # early return is safe
finally:
    ...      # cleanup

runtime.exit_code = returncode   # LINE ~192 — UnboundLocalError if exception occurred before assignment
```
- **Fix**: Add `returncode: int | None = None` before the `try` block, and guard the assignment `runtime.exit_code = returncode` accordingly.

---

## HIGH

### BUG-002 — Missing `cd` error check in setup-dev.sh

- **File**: `scripts/setup-dev.sh`
- **Lines**: ~127–129
- **Severity**: HIGH
- **Description**: The `cd` command in `setup_tui()` does not verify success. If the directory `src/sahya_code/tui` does not exist (e.g., partial clone, wrong working directory), `cd` fails silently. Despite `set -e` at the top of the script, the shell may not exit if `cd` is in a function context where the exit code is not propagated correctly. Subsequent `npm install` then runs in the wrong directory, and `cd ../../..` navigates to an unexpected location, breaking all subsequent setup steps.
- **Problematic Code**:
```bash
setup_tui() {
  print_info "Setting up TUI..."
  cd src/sahya_code/tui      # No error check — silently continues if dir doesn't exist
  npm install
  cd ../../..                # Returns to wrong location if first cd failed
  print_success "TUI dependencies installed"
}
```
- **Fix**: Use `cd src/sahya_code/tui || { print_error "TUI directory not found"; return 1; }` or wrap with `pushd`/`popd`.

---

### BUG-003 — Orphaned WebSocket connection on identity mismatch in useSessionStream.ts

- **File**: `web/src/hooks/useSessionStream.ts`
- **Lines**: ~2415–2420
- **Severity**: HIGH
- **Description**: In the `onopen` callback, if the WebSocket identity check fails (`wsRef.current !== ws`), the stale WebSocket `ws` is closed. However, the issue is that the `onmessage`, `onerror`, and `onclose` callbacks are still attached to `ws` before the identity check runs. If `ws.close()` triggers `onclose` before the callbacks can be cleaned up, the `onclose` handler may fire and alter application state (e.g., clearing session, setting error) even though this WebSocket was already superseded.
- **Problematic Code**:
```typescript
ws.onopen = () => {
  if (wsRef.current !== ws) {
    ws.close();   // Triggers onclose, which may corrupt state
    return;
  }
  // ...
};
```
- **Fix**: Set `ws.onclose = null`, `ws.onerror = null`, etc. before calling `ws.close()` to prevent stale callbacks from firing.

---

## MEDIUM

### BUG-004 — `last_known_runtime` potentially uninitialized in worker.py

- **File**: `src/sahya_code/background/worker.py`
- **Lines**: ~141–188
- **Severity**: MEDIUM
- **Description**: `last_known_runtime` is assigned only after a successful subprocess creation and a call to `store.read_runtime()`. If an exception is raised between subprocess creation (line ~141) and the `last_known_runtime = runtime` assignment (line ~150), the variable is never set. The `except` block returns early so this is safe in that path, but if the finally block or any post-try code references `last_known_runtime` (line ~188), it will cause an `UnboundLocalError`.
- **Problematic Code**:
```python
try:
    process = await asyncio.create_subprocess_exec(...)  # Line ~141
    runtime = store.read_runtime(task_id)
    store.write_runtime(task_id, runtime)
    last_known_runtime = runtime                          # Line ~150 — only assigned here
except Exception as exc:
    return   # safe
finally:
    ...

runtime = last_known_runtime.model_copy()                # Line ~188 — UnboundLocalError possible
```
- **Fix**: Initialize `last_known_runtime = None` before the `try` block, and add a guard: `if last_known_runtime is None: return` before accessing it.

---

### BUG-005 — Silent failure on unhandled WebSocket close codes in useSessionStream.ts

- **File**: `web/src/hooks/useSessionStream.ts`
- **Lines**: ~2503–2511
- **Severity**: MEDIUM
- **Description**: The `onclose` handler only sets error state for specific close codes (`4004` — session not found, `4029` — too many sessions). All other non-normal close codes (e.g., `1006` abnormal closure, `1011` server error, `4000`–`4003` custom errors) close silently without triggering `setError` or `onError`. Users receive no feedback when the connection drops unexpectedly.
- **Problematic Code**:
```typescript
ws.onclose = (event) => {
  if (event.code === 4004) {
    const err = new Error("Session not found");
    setError(err);
    onError?.(err);
  } else if (event.code === 4029) {
    const err = new Error("Too many concurrent sessions");
    setError(err);
    onError?.(err);
  }
  // All other close codes: silent failure, no user notification
};
```
- **Fix**: Add an `else` branch for unexpected close codes (anything other than `1000` normal closure) that sets an error state with a generic "connection lost" message.

---

### BUG-006 — Missing `mkdir -p` error handling in setup-dev.sh

- **File**: `scripts/setup-dev.sh`
- **Line**: ~152
- **Severity**: MEDIUM
- **Description**: `mkdir -p` is called without checking success. While `-p` suppresses errors for existing directories, it can still fail if the user lacks write permissions to `~/.config`. This would cause the config file creation to silently fail, leaving the application with no config and no error message.
- **Problematic Code**:
```bash
create_config() {
  local config_dir="${HOME}/.config/sahya"
  mkdir -p "$config_dir"    # No success check
  # Silently continues even if mkdir failed
  cat > "$config_dir/config.toml" << ...
}
```
- **Fix**: `mkdir -p "$config_dir" || { print_error "Cannot create config directory: $config_dir"; return 1; }`

---

## LOW

### BUG-007 — Broad `catch` blocks masking unexpected errors

- **File**: Multiple — `web/src/components/ai-elements/approval-dialog.tsx`, `question-dialog.tsx`, `display-content.tsx`, `prompt-input.tsx`
- **Severity**: LOW
- **Description**: Multiple components use bare `catch (e)` or `catch` blocks that swallow all exceptions without logging or re-throwing. This makes it impossible to distinguish expected errors (e.g., user cancellation) from unexpected runtime errors (e.g., null pointer, network failure), hindering debugging.
- **Pattern**:
```typescript
try {
  // ...
} catch (e) {
  // silent — no console.error, no logging, no re-throw
}
```
- **Fix**: At minimum, add `console.error(e)` in catch blocks, or use a typed error guard to only swallow expected error types.

---

### BUG-008 — Array index access without bounds check in question-dialog.tsx

- **File**: `web/src/features/chat/components/question-dialog.tsx`
- **Lines**: ~122–124
- **Severity**: LOW
- **Description**: Array indexing is performed without a bounds check. If the array is empty or shorter than expected (e.g., due to an API response change or race condition), this will produce `undefined` and may crash downstream code that treats the value as a defined object.
- **Fix**: Add a guard: `if (index >= array.length) return;` before accessing array elements by index.

---

### BUG-009 — install.sh does not verify `npm install` success for TUI

- **File**: `install.sh`
- **Lines**: ~216–220
- **Severity**: LOW
- **Description**: After `cd "$TUI_DIR"` and `npm install`, the script does not verify that `npm install` succeeded before proceeding with the build. If `npm install` fails (e.g., registry unreachable, version conflict), the subsequent `npm run build` will also fail with a cryptic error rather than a clear "dependency installation failed" message.
- **Problematic Code**:
```bash
cd "$TUI_DIR"
npm install         # No success check
npm run build       # Runs regardless of whether npm install succeeded
```
- **Fix**: `npm install || { echo "TUI dependency installation failed"; exit 1; }`

---

### BUG-010 — No validation that `INSTALL_DIR` is writable before installation begins

- **File**: `install.sh`
- **Lines**: Early setup section
- **Severity**: LOW
- **Description**: The installer does not check whether `INSTALL_DIR` (typically `~/.local/bin` or a user-specified path) is writable before beginning the installation. If the directory exists but is not writable (permissions issue), the installer proceeds through all download and build steps before failing at the final copy step, wasting time and leaving a partial installation.
- **Fix**: Add an early check: `[ -w "$INSTALL_DIR" ] || { echo "Error: $INSTALL_DIR is not writable"; exit 1; }`

---

*End of error_logs.md*
