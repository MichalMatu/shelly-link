#!/bin/sh
set -eu
BRANCH='feature/history-charts-20260930'
EXPECTED_MAIN='85e910499cbd10856720bf471df68164e2839fbb'
EXPECTED_FEATURE='9eaaf0171fe221c346831e9908505ff4cbe9de22'

git fetch --prune origin
[ "$(git rev-parse origin/main)" = "$EXPECTED_MAIN" ]
[ "$(git rev-parse origin/$BRANCH)" = "$EXPECTED_FEATURE" ]
git push origin --delete "$BRANCH"
git fetch --prune origin
if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  echo 'FEATURE_BRANCH_STILL_PRESENT'
  exit 2
fi
echo 'BRANCH_CLEANUP_DONE'
git ls-remote --heads origin | sed 's#refs/heads/##'
