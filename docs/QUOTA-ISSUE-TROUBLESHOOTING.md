# Quota Issue Troubleshooting

## Problem

After logging in with `/login` and selecting `kimi-for-coding`, you see:
```
Quota exceeded, please upgrade your plan or retry later
```

But your actual quota usage is only 38%.

## Possible Causes

1. **API Error Misclassification**: The server returns 403 with a message containing "quota" or "exceed", but the actual issue is different
2. **Stale OAuth Token**: The authentication token may be expired or invalid
3. **Model Configuration Issue**: The model might be using the wrong provider
4. **LiteLLM Proxy Issue**: The LiteLLM proxy may be incorrectly reporting quota status

## Diagnostic Steps

### Step 1: Run Diagnostics

```bash
sahya-code
> /diagnose
```

This will show:
- Current model and provider
- Whether thinking mode is enabled
- If kimi-for-coding is using the correct provider (`managed:kimi-code`)

### Step 2: Check Full Error Details

The error logs now include full details. Check the log file:
```bash
cat ~/.local/share/sahya-code/logs/sahya.log | grep -i "quota\|error"
```

### Step 3: Verify Configuration

Check your config file:
```bash
cat ~/.config/sahya/config.toml
```

You should see:
```toml
default_model = "kimi-code/kimi-for-coding"

[models."kimi-code/kimi-for-coding"]
provider = "managed:kimi-code"  # ← Must be managed:kimi-code
model = "kimi-for-coding"
```

If provider is `sahya` or anything else, that's the problem!

### Step 4: Re-authenticate

Try logging in again to refresh the token:

```bash
sahya-code
> /login
```

Then select `kimi-for-coding` again:
```bash
> /model
# Select kimi-for-coding
```

### Step 5: Check Usage Directly

```bash
> /usage
```

If this shows usage data, authentication is working. If not, there's an auth issue.

## Workarounds

### Option 1: Use kimi-k2.5 Instead

```bash
> /model
# Select kimi-k2.5 (uses Sahya provider)
```

### Option 2: Check Kimi Website

Visit https://kimi.com/coding to verify your actual quota status.

### Option 3: Wait and Retry

Sometimes the API has temporary issues. Wait a few minutes and retry.

## What We've Fixed

1. **Better error messages** - Now shows raw error details for debugging
2. **Diagnostics command** (`/diagnose`) - Shows configuration status
3. **Usage command improvements** - Better feedback when usage is unavailable
4. **Logging** - Full error details are logged to `~/.local/share/sahya-code/logs/sahya.log`

## If Nothing Works

If you've tried all steps and still get quota errors:

1. **Check the LiteLLM endpoint** - The issue might be on the server side
2. **Contact support** - Reach out to Kimi Code support with:
   - Your account email
   - The exact error message
   - Output of `/diagnose`
   - Relevant log entries from `~/.local/share/sahya-code/logs/sahya.log`

## Technical Details

The "Quota exceeded" error comes from HTTP 403 responses with messages containing "quota" or "exceed". However, we've seen cases where:
- The actual quota is fine
- The error is from LiteLLM, not the actual API
- Re-authenticating fixes it

The error handling now:
1. Logs full error details
2. Shows the raw error message
3. Suggests running `/usage` to verify
4. Provides workarounds
