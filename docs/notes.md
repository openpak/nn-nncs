# Notes: nn-nncs

OpenPak runs one instance per host, each behind cloud NAT with a single address, so the
upstream "both IPs on one machine" model does not apply. Each instance has a role (`nncs1` or
`nncs2`) and a peer; message type 2, which must be answered from the *other* address, is
relayed to the peer over UDP `PN_NNCS_RELAY_PORT` with an HMAC shared secret, and the peer
answers from its own alternate socket. Everything else is answered locally. See
`example.env`; run with host networking (`Network=host`).
