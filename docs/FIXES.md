# Bug Fixes Summary

## 1. "Invalid arguments" Display Bug (Fixed)

**Problem:** When tool calls had parsing errors, users saw confusing "Invalid arguments" messages.

**Root Cause:** 
- `ToolParseError` and `ToolValidateError` had brief message "Invalid arguments"
- When mid-stream errors occurred, partial tool arguments couldn't be parsed

**Fix:**
- Changed error messages to "Invalid tool arguments" for clarity
- Added visual indicator in tool call display when a tool fails
- Error is now shown as "failed" in the tool call line

**Files Changed:**
- `packages/kosong/src/kosong/tooling/error.py`
- `src/sahya_code/ui/shell/visualize.py`

## 2. Mid-Stream Error Handling (Fixed)

**Problem:** 
- LiteLLM errors like "Backend buffer overflow" and "MidStreamFallbackError" would stop execution
- These errors were not being retried
- Users saw raw error messages instead of helpful guidance

**Root Cause:**
- `_is_retryable_error()` only checked HTTP status codes
- Mid-stream errors often don't have proper status codes
- Error messages weren't user-friendly

**Fix:**
1. **Improved retry logic** (`src/sahya_code/soul/sahyasoul.py`):
   - Added detection for mid-stream error messages:
     - "buffer overflow"
     - "midstreamfallbackerror" 
     - "serviceunavailable"
     - "fallback error"
   - Now retries on these errors automatically

2. **Better error messages** (`src/sahya_code/ui/shell/__init__.py`):
   - Added specific handling for:
     - Buffer overflow errors → "Connection interrupted - temporary issue"
     - Service unavailable → "LLM service temporarily unavailable"
   - Users get clear retry guidance

**Files Changed:**
- `src/sahya_code/soul/sahyasoul.py`
- `src/sahya_code/ui/shell/__init__.py`

## 3. TUI Integration as Alternative UI (New Feature)

**Feature:** TUI can now be launched as an alternative to shell UI

**Usage:**
```bash
# Launch with TUI instead of shell UI
sahya-code --tui

# Or use subcommand
sahya-code tui
```

**Files Changed:**
- `src/sahya_code/cli/__init__.py` - Added `--tui` flag
- `src/sahya_code/app.py` - Added `run_tui()` method

## Testing the Fixes

### Test 1: Tool Error Display
```bash
# Run a command that might have parsing issues
sahya-code "Run a complex shell command with special characters"
```
Expected: If parsing fails, shows "failed" instead of "Invalid arguments"

### Test 2: Mid-Stream Error Recovery
```bash
# Run a long task that might hit backend limits
sahya-code "Analyze this large codebase thoroughly"
```
Expected: If buffer overflow occurs, automatic retry happens

### Test 3: TUI Mode
```bash
# Launch TUI
sahya-code --tui --work-dir ./my-project
```
Expected: Full-screen TUI launches instead of shell UI

## Error Messages Reference

| Error Type | Old Message | New Message |
|------------|-------------|-------------|
| Tool parse error | "Invalid arguments" | "Invalid tool arguments" |
| Buffer overflow | "LLM provider error: ...Backend buffer overflow..." | "⚠️ Connection interrupted - the LLM service experienced a temporary issue. The request may have been partially processed. Please retry if needed." |
| Service unavailable | "LLM provider error: ...ServiceUnavailable..." | "⚠️ LLM service temporarily unavailable. Please retry in a moment." |

## Retry Behavior

The following errors now trigger automatic retry:

- `APIConnectionError` / `APITimeoutError`
- `APIEmptyResponseError`
- HTTP 429, 500, 502, 503, 504
- **NEW:** Messages containing:
  - "buffer overflow"
  - "midstreamfallbackerror"
  - "serviceunavailable"
  - "fallback error"
  - "backend buffer"
  - "no fallback model group found"
