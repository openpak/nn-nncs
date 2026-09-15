# Ports — nn-nncs (trimmed)

> Trimmed copy for this repository; the canonical document lives at
> `Openpak/ports.md` and governs. Last synchronised 2026-09-15.

One block per concern, nothing below 20000, nothing at or above 27000 (Photon-Nextendo and
Steam live there). Every service reads its listeners from `<SVC>_HTTP_ADDR`, `<SVC>_GRPC_ADDR`,
`<SVC>_METRICS_ADDR`; the values below are the defaults and the local-run convention. Each
service owns a block of ten: +0 HTTP, +1 gRPC, +2 metrics/pprof, +3..+9 spare.

## NAT check (UDP, fixed by console)

| Port(s) | Service |
| --- | --- |
| 10025 / 10125 / 33334 / 33335 / 10225 | `nn-nncs` — Wii U/3DS NAT check (UDP). Fixed by the console, so outside the plan: nncs1 on the production box, nncs2 on the status box, 10225 is the peer relay |

Other services' rows live in the canonical ports.md.
