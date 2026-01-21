#!/usr/bin/env bash
set -u

for i in {1..5}; do
  cat testing_prompt.md | opencode run --model opencode/minimax-m2.1-free || break
done
