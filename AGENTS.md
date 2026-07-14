# AGENTS.md

## Project overview

This repo is a small verification task (see `README.md`): install the Weaviate
TypeScript client and check whether *using* it surfaces the deprecated
`punycode` (`DEP0040`) Node warning. The code is a minimal Node.js + TypeScript
(ESM) project:

- `src/index.ts` — hello-world that connects to a local Weaviate, creates a
  collection, inserts an object, queries it back, then reports whether a
  `punycode` warning was captured.
- `test/punycode.test.ts` — `node:test` suite documenting the DEP0040 behavior.

Standard commands live in `package.json` scripts (`start`, `build`, `typecheck`,
`lint`, `test`, `check:punycode`); run them with `npm run <script>`.

## Cursor Cloud specific instructions

- Node comes from `/exec-daemon/node` (currently v22.14.0) on `PATH`; nvm is also
  present (v22.22.2). Either works; no version pinning is required.
- `npm run start` and `npm test`'s first case require a **running Weaviate**.
  Docker is NOT preinstalled in the base image. To run Weaviate locally you must
  install Docker first (Docker 29 needs `fuse-overlayfs` + `containerd-snapshotter=false`
  in `/etc/docker/daemon.json`, `iptables-legacy`, and `sudo dockerd`), then:
  `sudo docker run -d --name weaviate -p 8080:8080 -p 50051:50051 -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true -e PERSISTENCE_DATA_PATH=/var/lib/weaviate -e DEFAULT_VECTORIZER_MODULE=none -e CLUSTER_HOSTNAME=node1 cr.weaviate.io/semitechnologies/weaviate:1.28.2`
  The client reads `WEAVIATE_HOST`/`WEAVIATE_HTTP_PORT`/`WEAVIATE_GRPC_PORT` env vars.
- `npm run build`, `npm run typecheck`, `npm run lint`, and the two non-network
  test cases run with no server and no Docker.
- Punycode finding: `weaviate-client` only reaches the built-in `punycode` via
  transitive deps inside `node_modules` (`whatwg-url@5` / `tr46@0.0.3`). Modern
  Node suppresses `DEP0040` for `require("punycode")` calls that originate inside
  `node_modules`, so end users of the client do NOT see the warning; it only
  appears when `require('punycode')` is called from user code outside
  `node_modules`.
