# Deploy: nn-nncs

Image: `ghcr.io/openpak/nn-nncs` on tag.

## Ports

UDP 10025 and 10125 (both roles), 33334 and 33335 (nncs1), 10225 relay from the peer.

## Environment

From `example.env`:

```sh
# nn-nncs: one instance per public address. Consoles expect nncs1.app.nintendowifi.net and
# nncs2.app.nintendowifi.net on two different public IPs, ports 10025 and 10125 (fixed by the
# console). Run with host networking: replies leave from OS-assigned ports.
PN_NNCS_ROLE=nncs1                      # nncs1 | nncs2
PN_NNCS_PEER_HOST=203.0.113.2           # public address of the other instance
PN_NNCS_RELAY_PORT=10225                # udp, reachable from the peer only
PN_NNCS_RELAY_SECRET=change-me-shared-with-the-peer
PN_NNCS_LOCAL_IP_ADDRESS=203.0.113.1    # this instance's public address (reported to consoles)

```

## Topology

OpenPak runs one instance per host, each behind cloud NAT with a single address, so the
upstream "both IPs on one machine" model does not apply. Each instance has a role (`nncs1` or
`nncs2`) and a peer; message type 2, which must be answered from the *other* address, is
relayed to the peer over UDP `PN_NNCS_RELAY_PORT` with an HMAC shared secret, and the peer
answers from its own alternate socket. Everything else is answered locally. Run with host
networking (`Network=host`).

## Release

Pushing a `v*.*.*` tag runs `.github/workflows/release.yml`, which publishes `ghcr.io/openpak/nn-nncs` (version tags and `latest`, amd64 and arm64).
