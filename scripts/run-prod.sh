#!/bin/bash
set -e
export VITE_CONVEX_URL=https://uncommon-sandpiper-321.convex.cloud

models=(
  "minimax/minimax-m2.5"
  "deepseek/deepseek-v3.2"
  "x-ai/grok-4.1-fast"
  "x-ai/grok-4.20-beta"
  "moonshotai/kimi-k2-thinking"
  "moonshotai/kimi-k2.5"
  "google/gemini-3-flash-preview"
  "google/gemini-3.1-pro-preview"
  "z-ai/glm-5"
  "anthropic/claude-sonnet-4.6"
  "anthropic/claude-opus-4.6"
  "openai/gpt-5.3-chat"
  "openai/gpt-5.3-codex"
  "openai/gpt-5.4"
  "openai/gpt-5.4-nano"
  "openai/gpt-5.4-mini"
  "openai/gpt-5.4-pro"
  "anthropic/claude-haiku-4.5"
  "qwen/qwen3.5-397b-a17b"
  "qwen/qwen3-max"
)

for model in "${models[@]}"; do
  echo "\n▶ Running $model..."
  npm run bench "$model" || echo "⚠ $model failed, continuing..."
done

echo "\n✓ All models done."
