SHELL := /bin/bash

# .env 파일이 있으면 자동 로드 (없어도 에러 안 남)
-include .env
export

JIRA_PROJECT_KEY ?= S14P31S307

.PHONY: help start commit finish list-transitions check-env _require-env

help:
	@echo ""
	@echo "Available commands:"
	@echo ""
	@echo "  make start              - create branch + transition issues to In Progress"
	@echo "  make commit             - guided commit with Jira keys"
	@echo "  make finish             - transition issues to Done"
	@echo "  make list-transitions   - list workflow transition IDs"
	@echo "  make check-env          - verify .env values"
	@echo ""

# Silent env validation (used as dependency by other targets)
_require-env:
	@if [ -z "$(JIRA_BASE)" ];  then echo "[ERROR] JIRA_BASE not set";  exit 1; fi
	@if [ -z "$(JIRA_EMAIL)" ]; then echo "[ERROR] JIRA_EMAIL not set"; exit 1; fi
	@if [ -z "$(JIRA_TOKEN)" ]; then echo "[ERROR] JIRA_TOKEN not set"; exit 1; fi

# Verbose env check (for manual verification)
check-env: _require-env
	@echo "[OK] env loaded"
	@echo "   JIRA_BASE  = $(JIRA_BASE)"
	@echo "   JIRA_EMAIL = $(JIRA_EMAIL)"
	@printf "   JIRA_TOKEN length = %s chars\n" "$$(printf '%s' '$(JIRA_TOKEN)' | wc -c)"

# Query workflow transition IDs from a Jira issue
list-transitions: _require-env
	@read -p "Issue number to query (e.g. 1): " N; \
	echo ""; \
	curl -s -u "$(JIRA_EMAIL):$(JIRA_TOKEN)" \
	  "$(JIRA_BASE)/rest/api/3/issue/$(JIRA_PROJECT_KEY)-$$N/transitions" \
	  | PYTHONIOENCODING=utf-8 python -c "import sys, json; d=json.load(sys.stdin); [print(f\"  ID={t['id']:>3} | {t['name']:<10} -> {t['to']['name']}\") for t in d.get('transitions', [])]"

# Create branch + transition Jira issues to In Progress
start: _require-env
	@if [ -z "$(JIRA_TRANSITION_IN_PROGRESS)" ]; then \
		echo "[ERROR] JIRA_TRANSITION_IN_PROGRESS not set. Run 'make list-transitions' first"; exit 1; \
	fi
	@read -p "Branch name (e.g. BE/feat/video-upload): " BRANCH; \
	read -p "Issue numbers (comma-separated, e.g. 172,173): " ISSUES; \
	if [ -z "$$BRANCH" ] || [ -z "$$ISSUES" ]; then echo "[ERROR] empty input"; exit 1; fi; \
	git checkout -b "$$BRANCH" || exit 1; \
	echo ""; \
	for N in $$(echo $$ISSUES | tr ',' ' '); do \
		bash scripts/jira_transition.sh "$(JIRA_PROJECT_KEY)-$$N" "$(JIRA_TRANSITION_IN_PROGRESS)" in-progress; \
	done

# Guided commit (story key in subject + task keys in body)
commit:
	@read -p "Story issue number (e.g. 164): " STORY; \
	read -p "Commit message: " MSG; \
	read -p "Completed task numbers (comma-separated, optional): " TASKS; \
	if [ -z "$$STORY" ] || [ -z "$$MSG" ]; then echo "[ERROR] story/message empty"; exit 1; fi; \
	if [ -z "$$TASKS" ]; then \
		git commit -m "$(JIRA_PROJECT_KEY)-$$STORY $$MSG"; \
	else \
		BODY="Tasks: $$(echo $$TASKS | sed 's/, */, $(JIRA_PROJECT_KEY)-/g; s/^/$(JIRA_PROJECT_KEY)-/')"; \
		git commit -m "$(JIRA_PROJECT_KEY)-$$STORY $$MSG" -m "$$BODY"; \
	fi

# Manual Done transition (backup when Jira automation is not used)
finish: _require-env
	@if [ -z "$(JIRA_TRANSITION_DONE)" ]; then \
		echo "[ERROR] JIRA_TRANSITION_DONE not set. Run 'make list-transitions' first"; exit 1; \
	fi
	@read -p "Issue numbers to complete (comma-separated, e.g. 172,173): " ISSUES; \
	if [ -z "$$ISSUES" ]; then echo "[ERROR] empty input"; exit 1; fi; \
	echo ""; \
	for N in $$(echo $$ISSUES | tr ',' ' '); do \
		bash scripts/jira_transition.sh "$(JIRA_PROJECT_KEY)-$$N" "$(JIRA_TRANSITION_DONE)" done; \
	done
