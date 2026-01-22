#!/usr/bin/env bash
set -u

OPENCODE_CONFIG_CONTENT=$(cat opencode.ralph.json)

for i in {1..10}; do
  cat PROMPT.md | opencode run --model opencode/minimax-m2.1-free || break
done
