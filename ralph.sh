#!/usr/bin/env bash
set -u

for i in {1..10}; do
  cat PROMPT.md | opencode run --model opencode/kimi-k2.5-free || break
done
