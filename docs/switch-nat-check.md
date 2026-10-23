# Switch NAT check (folded from nat-check, retired 2026-10-17)

NAT check for the Switch is **served by `nn-nncs`**; there is nothing to build here.

Pia's NAT detection resolves `nncs1-lp1.n.n.srv.nintendo.net` and `nncs2-lp1.n.n.srv.nintendo.net`
and sends 16-byte UDP probes (four big-endian u32: type, external port, external address,
local address) to ports 10025 and 10125, with reachability sinkholes on 33334 and 33335. That
is byte-for-byte the NAT check protocol the Wii U and 3DS use, which is publicly documented and
implemented in Pretendo's `nncs` (AGPL). OpenPak's fork of it runs as two instances on two
public addresses, the way the console requires, and `openpak.nro` 0.2.1 points both names at
them.

Evidence: observed console behaviour (the names, ports and probe layout) recorded from a
Mario Kart 8 Deluxe run, per `Openpak/docs/clean-room-policy.md`.

This project is not affiliated with or endorsed by Nintendo. It contains no proprietary code,
assets, keys, certificates or captures.
