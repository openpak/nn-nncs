# Next session — nn-nncs

Updated 2026-09-24.

NAT check server (Pretendo `nncs`, AGPL) for Wii U, 3DS — and the Switch,
which speaks the same protocol on the same ports. Deployed 2026-09-10 as two
instances on two public addresses, per the console's requirement that nncs1
and nncs2 never share an IP. Not console-verified. Tree clean.

Current status 2026-09-24: latest tag still v0.1.1 (0fedd95). Since then only
the README Switch note (6bc131c), CI on `v*.*.*` tags only (5fa30cb) and docs
commits — all untagged.

## Where things stand

- Upstream implements message types 1–5 and 101–103 on UDP 10025/10125 per
  server, plus sinkholes for the reply-less 33334/33335 probes. Upstream's
  model (both IPs on one machine) does not fit OpenPak's cloud-NAT hosts.
- OpenPak rewiring (`6ff76d4`, tagged `v0.1.0`): one instance per host with a
  role (`PN_NNCS_ROLE=nncs1|nncs2`) and a peer. Message type 2 — which must
  be answered from the *other* address — is relayed to the peer over UDP
  `PN_NNCS_RELAY_PORT` (10225) with an HMAC shared secret, and the peer
  answers from its own alternate socket. Everything else is answered locally.
  Host networking required (`Network=host`). `v0.1.1` fixed the Dockerfile
  (dotenv is not bundled by tsup).
- Deployment: nncs1 on the production box (145.241.199.19), nncs2 on the
  status box (145.241.228.207) — the split the 3DS PRD and `nn-sssl-dns`
  both assume.
- Switch: Pia's NAT detection resolves `nncs1-lp1` / `nncs2-lp1.n.n.srv.nintendo.net`
  and sends the same 16-byte probes (type, external port, external address,
  local address) to 10025/10125. `openpak.nro` 0.2.1 points both names at
  the two instances; `servers/nat-check` is docs-only, nothing to build.
  This fact is written into the README but sits one commit past `v0.1.1` —
  unreleased.
- Protocol evidence came from an observed Mario Kart 8 Deluxe run (clean-room
  rules); no console has probed *these* two instances yet.

## Next steps

1. Tag the README commit (`v0.1.2`) so the Switch note ships with the image.
2. Verify from a console: a Switch online session through `openpak.nro`
   (MK8D is the known reproducer) or a signed-in Wii U/3DS — confirm the NAT
   classification and that type 2 is actually answered from the peer's
   address, not the local one.
3. Watch both instances' logs during that first probe; the HMAC relay across
   the WAN peer is the only path never exercised.

## Pointers

- `README.md` — roles, relay, env table; `example.env` — the four `PN_NNCS_*`
  variables per instance.
- `../../servers/nat-check/README.md` — the Switch side, probe layout, and
  why nn-nncs owns it.
- `../../ports.md` — the 10025/10125/33334/33335/10225 row.
- `../../prds/platform-3ds-prd.md` — §2 names the two host addresses.

## Scratch (research and throwaway work)

Decompiles, Ghidra projects, dumps, exefs/romfs extracts, packet captures,
strace and emulator logs, probe harnesses: put them in
`~/REPOS/Openpak/scratch/<topic>`. That folder is a local mount of the media pool,
outside every repository, so nothing in it is committed. Never use `/tmp` (a
shared 15 GB RAM disk) or elsewhere on `/home` for this. Keys and signing
material never go there. Rule: `docs/playbooks/conventions.md` in the workspace.
