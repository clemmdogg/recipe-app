# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

A school project: a family dinner-planning app with its own REST API. One git repository (branch `master`):

- `mobile/` – the Expo (React Native) app. It works fully offline with a local SQLite database. **Read `mobile/CLAUDE.md`** (imported below) for its architecture, rules and every product and backend decision made so far.
- `api/` – the self-built RESTful API in TypeScript on Node.js, with PostgreSQL. **Not created yet.**

Run each project's commands from its own folder: `cd mobile && npm test`, and later `cd api && ...`. Git commands work from anywhere in the repository.

@mobile/CLAUDE.md

## Next step: the API

The backend decisions are in `mobile/CLAUDE.md` under "Planned: login and household sync":

- the households model and invites
- email and password login with JWT
- sync rules: last write wins per row, server-set `updated_at`, soft deletes, name-based ids
- hosting on a Contabo VPS with Docker, and Caddy for HTTPS

Before writing any API code:

1. Settle what is "Not decided yet" there: the API framework and libraries, and how to run Postgres locally. Docker isn't installed on the development machine.
2. Write an **API design document** in `api/`: every endpoint with its method, path, request and response bodies, status codes and access rules, plus how SSL and authentication work. The student reviews it before anything is built, and it doubles as material for the school report.

The API follows the same **loose coupling** principle as the app (see "Loose coupling" in `mobile/CLAUDE.md`): routes, business logic and database access in separate layers that talk through small, typed functions.

When the API exists, add its commands, structure and rules to this file.

## Working with the student

- The student writes in **Danish**, so reply in Danish. Everything in the app and the code (UI text, identifiers, comments, docs) is in **English**.
- The student is new to programming, so explain decisions in plain language and recommend one option instead of listing many.
- Propose a plan and get it approved before larger changes. Ask the student to test on their phone before committing app changes.
- Commit only when the student asks.
