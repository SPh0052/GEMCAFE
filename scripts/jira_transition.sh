#!/usr/bin/env bash
# Jira 이슈를 지정한 transition ID로 전환
# Usage: jira_transition.sh <ISSUE-KEY> <TRANSITION-ID> [TYPE]
#   TYPE: in-progress | done (출력 메시지 라벨용, 선택)
# Env required: JIRA_BASE, JIRA_EMAIL, JIRA_TOKEN
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <ISSUE-KEY> <TRANSITION-ID> [TYPE]" >&2
  exit 1
fi

ISSUE_KEY="$1"
TRANSITION_ID="$2"
TYPE="${3:-}"

case "$TYPE" in
  in-progress) MESSAGE="진행 중으로 전환 완료" ;;
  done)        MESSAGE="완료로 전환 완료" ;;
  *)           MESSAGE="" ;;
esac

: "${JIRA_BASE:?❌ JIRA_BASE not set (.env 확인)}"
: "${JIRA_EMAIL:?❌ JIRA_EMAIL not set (.env 확인)}"
: "${JIRA_TOKEN:?❌ JIRA_TOKEN not set (.env 확인)}"

if [ -z "$TRANSITION_ID" ]; then
  echo "❌ TRANSITION_ID가 비어있음 (.env에 JIRA_TRANSITION_* 설정 필요)" >&2
  exit 1
fi

response=$(curl -sw "\n%{http_code}" -X POST \
  -u "$JIRA_EMAIL:$JIRA_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"transition\":{\"id\":\"$TRANSITION_ID\"}}" \
  "$JIRA_BASE/rest/api/3/issue/$ISSUE_KEY/transitions")

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "204" ]; then
  if [ -n "$MESSAGE" ]; then
    echo "✅ $ISSUE_KEY → $MESSAGE"
  else
    echo "✅ $ISSUE_KEY → 전환 완료 (transition $TRANSITION_ID)"
  fi
else
  echo "❌ $ISSUE_KEY → 전환 실패 (HTTP $http_code)" >&2
  if [ -n "$body" ]; then
    echo "$body" >&2
  fi
  exit 1
fi
