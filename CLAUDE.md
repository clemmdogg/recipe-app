# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

A school project: a family dinner-planning app with its own REST API. One git repository (branch `master`):

- `mobile/` – the Expo (React Native) app. It works fully offline with a local SQLite database. **Read `mobile/CLAUDE.md`** (imported below) for its architecture, rules and every product and backend decision made so far.
- `api/` – the self-built RESTful API: Fastify, TypeScript and PostgreSQL. **Read `api/CLAUDE.md`** (imported below) for its commands, structure and rules, and `api/docs/api-design.md` for every endpoint.

Run each project's commands from its own folder: `cd mobile && npm test`, `cd api && npm test`. Git commands work from anywhere in the repository.

The product and backend decisions (households, login, sync rules, hosting) are in `mobile/CLAUDE.md` under "Planned: login and household sync".

@mobile/CLAUDE.md

@api/CLAUDE.md

## Current work: the API

The API has health, login, accounts, household, invites and sync, with tests. What is left, with tests for each part, letting the student try each part before moving on:

1. ~~Login: signup, login, refresh, logout, delete account~~ Done
2. ~~Household and invites~~ Done
3. ~~Sync~~ Done
4. Docker and Caddy on the VPS: the files are in `deploy/` (see `deploy/README.md`), the server is set up and DNS points at it. Left: get the code onto the server (a private GitHub repository) and start it.

Then connect the app (see "Changes needed in the app" in `api/docs/api-design.md`).

## Working with the student

- The student writes in **Danish**, so reply in Danish. Everything in the app and the code (UI text, identifiers, comments, docs) is in **English**.
- The student is new to programming, so explain decisions in plain language and recommend one option instead of listing many.
- Propose a plan and get it approved before larger changes. Ask the student to test on their phone before committing app changes.
- Commit only when the student asks.
