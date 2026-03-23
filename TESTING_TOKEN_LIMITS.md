# Token Reduction Changes (Testing Only)

These changes were made to `ai_chat.jac` to stay under Claude's 50k token/min rate limit during testing.
**Revert these when switching to OpenAI or a paid Anthropic plan.**

## Changes to revert in `ai_chat.jac`

### 1. Resume truncation (line ~30)
**Current (testing):**
```
if len(raw_text) > 3000 {
    raw_text = raw_text[:3000] + "\n[truncated]";
}
```
**Revert to:** remove those 3 lines entirely — return the full `raw_text`.

### 2. History cap (line ~194)
**Current (testing):**
```
recent_history = self.history[-6:] if len(self.history) > 6 else self.history;
history_text = history_to_text(recent_history);
```
**Revert to:**
```
history_text = history_to_text(self.history);
```

### 3. Company list cap (line ~72)
**Current (testing):**
```
return json.dumps(companies[:30]);
```
**Revert to:**
```
return json.dumps(companies);
```
