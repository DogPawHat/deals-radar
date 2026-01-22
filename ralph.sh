#!/usr/bin/env bash
set -u

for i in {1..10}; do
  cat PROMPT.md | opencode run --model opencode/minimax-m2.1-free || break
done
