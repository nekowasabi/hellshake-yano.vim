#!/usr/bin/env bash
# Run every tests-vim/ file headless with Neovim. See scripts/test-vim.sh.
exec "$(dirname "${BASH_SOURCE[0]}")/test-vim.sh" --nvim "$@"
