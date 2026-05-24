#!/bin/sh
# leashd installer (early access).
# A published one-line install is coming. For now, install from source.
set -e

green=$(printf '\033[32m'); dim=$(printf '\033[2m'); reset=$(printf '\033[0m')

echo "${green}leashd${reset} installer"
echo ""
echo "leashd is in early access. A published one-line install is on the way."
echo "For now, install from source:"
echo ""
echo "  ${dim}# requires git, node >= 22.5, pnpm${reset}"
echo "  git clone https://github.com/brainbytes-dev/leashd"
echo "  cd leashd && pnpm install"
echo "  pnpm --filter @repo/leashd build"
echo ""
echo "Then wire it into your agent as an MCP server. Guide:"
echo "  https://leashd.dev/docs"
echo ""
echo "Star and watch the repo to get notified when the binary ships:"
echo "  https://github.com/brainbytes-dev/leashd"
