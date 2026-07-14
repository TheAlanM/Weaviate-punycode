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
- Punycode finding: with `graphql-request@6` (weaviate-client's default),
  `weaviate-client` pulls in `graphql-request@6 -> cross-fetch -> node-fetch@2 ->
  whatwg-url@5 -> tr46@0.0.3`, which `require("punycode")` (the deprecated
  built-in) and surface `DEP0040` to end users on common Node builds
  (e.g. 21.x, 22.22.x). This repo forces `graphql-request@7` via the `overrides`
  field; v7 uses the native `fetch`, drops the `cross-fetch/node-fetch/whatwg-url/tr46`
  chain, and the warning no longer appears.
- Node version caveat: whether `DEP0040` prints for a `require("punycode")` that
  originates inside `node_modules` varies by Node build. It prints on nvm's
  v22.22.2 and v21.7.3 here, but the `/exec-daemon/node` v22.14.0 build on `PATH`
  suppresses it. To reproduce the warning, run with a nvm build, e.g.
  `~/.nvm/versions/node/v22.22.2/bin/node --import tsx src/index.ts`.
- Note: `graphql-request@7` is an API-breaking major vs the `@6` that
  `weaviate-client@3` declares; the hello-world round-trip still passes, but the
  override should be validated against the client's GraphQL code paths before
  relying on it as a real fix.
