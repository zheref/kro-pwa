# Kro Web — canonical entry points.
#
# Every verb below is the single supported way to do the thing it names. CI, the
# agents and a human on a fresh clone all go through these, so a change in the
# underlying tool (npm -> pnpm, Jest -> Vitest, ...) never changes the interface.

.DEFAULT_GOAL := help
.PHONY: help setup dev build lint typecheck analyze test codegen tokens deploy publish clean

PNPM ?= pnpm

## help: list the available verbs
help:
	@echo "Kro Web — make targets:"
	@echo "  setup     install the toolchain and all workspace dependencies"
	@echo "  dev       run the web app in development mode"
	@echo "  build     production build of every workspace member"
	@echo "  lint      lint every workspace member (includes the @kro/core platform-free check)"
	@echo "  typecheck tsc --noEmit across every workspace member"
	@echo "  analyze   production build with the bundle analyzer enabled"
	@echo "  test      run every workspace member's test suite"
	@echo "  codegen   generate derived sources (no-op today)"
	@echo "  tokens    generate design tokens (no-op today)"
	@echo "  deploy    deploy the web app (not wired — see TOOLCHAIN.md)"
	@echo "  publish   publish artifacts (n/a for a PWA)"
	@echo "  clean     remove build output and caches"

## setup: install the toolchain and all workspace dependencies
setup:
	corepack enable
	$(PNPM) install

## dev: run the web app in development mode
dev:
	$(PNPM) turbo run dev

## build: production build of every workspace member
build:
	$(PNPM) turbo run build

## lint: lint every workspace member
lint:
	$(PNPM) turbo run lint

## typecheck: tsc --noEmit across every workspace member
typecheck:
	$(PNPM) -r exec tsc --noEmit

## analyze: production build with the bundle analyzer enabled
analyze:
	$(PNPM) turbo run analyze

## test: run every workspace member's test suite
test:
	$(PNPM) turbo run test

## codegen: generate derived sources
codegen:
	@echo "codegen: nothing to generate yet."
	@echo "  Reserved for API clients and generated types; wired when a generator lands."

## tokens: generate design tokens
tokens:
	@echo "tokens: nothing to generate yet."
	@echo "  Reserved for the KroTokens pipeline; wired by the design-system child of #1."

## deploy: deploy the web app
deploy:
	@echo "deploy: no target is wired yet."
	@echo "  The host (Vercel vs Google Cloud Run) is an open decision — see README.md"
	@echo "  and TOOLCHAIN.md. This verb stays a stub until that call is made."
	@exit 1

## publish: publish artifacts
publish:
	@echo "publish: n/a — Kro Web is a PWA, there is no package or store pipeline."
	@echo "  Releases ship via 'make deploy'."

## clean: remove build output and caches
clean:
	rm -rf apps/web/.next apps/web/coverage .turbo node_modules/.cache
