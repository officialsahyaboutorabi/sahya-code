# Using kimi-for-coding Model

## Overview

`kimi-for-coding` is a specialized model available through the **Kimi Code** platform (api.kimi.com). It requires separate authentication from the default Sahya provider.

## Setup

### Step 1: Login to Kimi Code

Run the login command to authenticate with Kimi Code:

```bash
sahya-code
> /login
```

This will:
1. Open a browser for OAuth authentication
2. Fetch available models from Kimi Code (including `kimi-for-coding`)
3. Configure the `managed:kimi-code` provider

### Step 2: Use the Model

After logging in, you can use `kimi-for-coding` via:

```bash
# Option 1: Set as default model
> /model
# Select "kimi-for-coding" from the list

# Option 2: Use via --model flag
sahya-code --model kimi-code/kimi-for-coding

# Option 3: Configure in config.toml
```

## Configuration

After `/login`, your config will have:

```toml
# ~/.config/sahya/config.toml
default_model = "kimi-code/kimi-for-coding"

[models."kimi-code/kimi-for-coding"]
provider = "managed:kimi-code"
model = "kimi-for-coding"
max_context_size = 256000
capabilities = ["thinking", "image_in", "video_in"]

[providers."managed:kimi-code"]
type = "kimi"
base_url = "https://api.kimi.com/coding/v1"
api_key = ""
oauth = { storage = "keyring", key = "oauth/kimi-code" }
```

## Troubleshooting

### "Quota exceeded" error

If you see this error but have quota available:

```
Quota exceeded, please upgrade your plan or retry later
```

**Cause**: The model is trying to use the wrong provider.

**Fix**: 
1. Run `/login` again to refresh the OAuth token
2. Check that your model uses provider `managed:kimi-code`:
   ```bash
   > /model
   # Should show provider as "managed:kimi-code"
   ```

### "Model not found" error

If you see:
```
Model 'kimi-for-coding' requires Kimi Code authentication.
Please run /login to authenticate with Kimi Code.
```

**Fix**: Run `/login` and complete the OAuth flow.

### "Access denied" error

This could mean:
1. Your OAuth token expired - run `/login` again
2. Your account doesn't have access to `kimi-for-coding`
3. The model name changed on the platform

## Provider Differences

| Feature | Sahya Provider | Kimi Code Provider |
|---------|---------------|-------------------|
| Endpoint | `llm.nexiant.ai` | `api.kimi.com/coding/v1` |
| Auth | API Key | OAuth |
| Models | `kimi-k2.5` | `kimi-for-coding`, `kimi-k2.5` |
| Setup | Config file | `/login` command |

## Switching Between Providers

To switch from Sahya to Kimi Code:

```bash
# In sahya-code shell
> /login                    # Authenticate with Kimi Code
> /model                    # Select kimi-for-coding
```

To switch back to Sahya:

```bash
> /model                    # Select a sahya provider model
```

## Using with TUI

The TUI works with kimi-for-coding too:

```bash
# After running /login in shell mode
sahya-code --tui --model kimi-code/kimi-for-coding
```

## Model Capabilities

`kimi-for-coding` supports:
- ✅ Thinking mode (reasoning)
- ✅ Image input
- ✅ Video input
- ✅ Tool use

Enable thinking mode:
```bash
sahya-code --model kimi-code/kimi-for-coding --thinking
```
