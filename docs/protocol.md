# Protocol: nn-nncs

Fork of Pretendo's `nncs` (AGPL-3.0). The Switch (`nncs1-lp1.n.n.srv.nintendo.net`, `nncs2-lp1.n.n.srv.nintendo.net`, redirected by `openpak.nro`) speaks the same protocol on the same ports. Wii U and 3DS consoles resolve `nncs1.app.nintendowifi.net` and
`nncs2.app.nintendowifi.net` to two **different public addresses** and probe UDP 10025 and
10125 on each to classify their NAT before NEX matchmaking.
