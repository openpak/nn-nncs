# Wii U/3DS NAT Check Server

OpenPak's Wii U/3DS NAT Check Server.

| | |
| --- | --- |
| Network | Wii U, 3DS, Switch |
| Role | NAT check for NEX matchmaking: two instances (`nncs1`, `nncs2`) on separate public addresses, peered over UDP |
| Image | `ghcr.io/openpak/nn-nncs` |
| Based on | [Pretendo `nncs`](https://github.com/PretendoNetwork/nncs) (AGPL-3.0) |
| Licence | AGPL-3.0-only |

## What it serves

| Endpoint | What |
| --- | --- |
| UDP 10025, 10125 | NAT check probes, both roles (message types: see [upstream](docs/upstream.md)) |
| UDP 33334, 33335 | Reachability sinkholes on nncs1, no replies |
| UDP 10225 (`PN_NNCS_RELAY_PORT`) | Peer relay for message type 2, HMAC-authenticated |

## Run

```sh
cp example.env .env   # fill in the values for this instance
npm ci
npm run build
npm start
```

Container, ports and environment: [deploy](docs/deploy.md).

## Docs

- [Protocol](docs/protocol.md)
- [Evidence](docs/evidence.md)
- [Deploy](docs/deploy.md)
- [Notes](docs/notes.md)
- [Upstream README](docs/upstream.md)
- [Docs index](docs/README.md)
- [Switch NAT check](docs/switch-nat-check.md)

## Licence

AGPL-3.0-only. See [LICENSE](LICENSE).
