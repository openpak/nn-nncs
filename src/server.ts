import net from 'node:net';
import os from 'node:os';
import dgram from 'node:dgram';
import { createHmac, timingSafeEqual } from 'node:crypto';
import 'dotenv/config';

type NATMessage = {
	type: number;
	externalPort: number;
	externalAddress: number;
	localAddress: number;
};

// OpenPak runs the two NAT check servers on two hosts, each behind cloud NAT with one public
// address (upstream bound both public IPs on one machine). Each instance knows its role and
// its peer; the one message type that must be answered from the *other* address (type 2) is
// relayed to the peer, which sends the reply from its own alternate socket.
const ROLE = process.env.PN_NNCS_ROLE;
const PEER_HOST: string = process.env.PN_NNCS_PEER_HOST ?? '';
const RELAY_PORT = Number(process.env.PN_NNCS_RELAY_PORT || 10225);
const RELAY_SECRET: string = process.env.PN_NNCS_RELAY_SECRET ?? '';

if (ROLE !== 'nncs1' && ROLE !== 'nncs2') {
	throw new Error('PN_NNCS_ROLE must be nncs1 or nncs2');
}

if (!PEER_HOST.trim()) {
	throw new Error('PN_NNCS_PEER_HOST environment variable not set (public address of the other NAT check server)');
}

if (!RELAY_SECRET.trim()) {
	throw new Error('PN_NNCS_RELAY_SECRET environment variable not set (shared with the peer)');
}

const LOCAL_IP_ADDRESS = getLocalIPAddress();
const LOCAL_IP_INT = ip2int(LOCAL_IP_ADDRESS);

const PRIMARY_PORT = 10025;
const SECONDARY_PORT = 10125;
const UNKNOWN_PORT_33334 = 33334; // * Unknown uses
const UNKNOWN_PORT_33335 = 33335; // * Unknown uses

const PRIMARY_SOCKET = dgram.createSocket('udp4');
const SECONDARY_SOCKET = dgram.createSocket('udp4');

// * Message types 2, 3 and 102 send responses back from random ports. So
// * create an "alternate" socket for these message types
const ALTERNATE_SOCKET = dgram.createSocket('udp4');

// * Peer relay: type 2 requests the peer received, to be answered from our alternate socket
const RELAY_SOCKET = dgram.createSocket('udp4');

// * NNCS1 gets messages on 2 ports with unknown uses. Just sinkholing them for now
// * so the client knows the ports are reachable
const PORT_33334_SOCKET = dgram.createSocket('udp4');
const PORT_33335_SOCKET = dgram.createSocket('udp4');

const HANDLERS: Record<number, (message: any, rinfo: dgram.RemoteInfo, socket: dgram.Socket) => void> = {
	1: handleMessageType1,
	2: handleMessageType2,
	3: handleMessageType3,
	4: handleMessageType4,
	5: handleMessageType5,
	101: handleMessageType101,
	102: handleMessageType102,
	103: handleMessageType103
};

if (ROLE === 'nncs1') {
	PORT_33334_SOCKET.bind(UNKNOWN_PORT_33334);
	PORT_33335_SOCKET.bind(UNKNOWN_PORT_33335);
}
PRIMARY_SOCKET.bind(PRIMARY_PORT);
SECONDARY_SOCKET.bind(SECONDARY_PORT);
ALTERNATE_SOCKET.bind(0); // * Let the OS assign a random port
RELAY_SOCKET.bind(RELAY_PORT);

RELAY_SOCKET.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
	// * 32-byte HMAC-SHA256 | 16-byte response | 4-byte destination address | 2-byte destination port
	if (msg.length !== 54 || rinfo.address !== PEER_HOST) {
		return;
	}
	const mac = createHmac('sha256', RELAY_SECRET).update(msg.subarray(32)).digest();
	if (!timingSafeEqual(mac, msg.subarray(0, 32))) {
		return;
	}
	const response = msg.subarray(32, 48);
	const address = int2ip(msg.readUInt32BE(48));
	const port = msg.readUInt16BE(52);
	ALTERNATE_SOCKET.send(response, port, address);
});

[PRIMARY_SOCKET, SECONDARY_SOCKET].forEach((socket) => {
	socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
		handleMessage(msg, rinfo, socket);
	});
});

PORT_33334_SOCKET.on('message', (_msg: Buffer, _rinfo: dgram.RemoteInfo) => {
	// * Do nothing, should be 16 null bytes. Just sinkhole it so the client knows the port is reachable
});

PORT_33335_SOCKET.on('message', (_msg: Buffer, _rinfo: dgram.RemoteInfo) => {
	// * Do nothing, just sinkhole it so the client knows the port is reachable.
	// * Seems to always be 56 bytes of mostly static data
	// * Bytes 0-7 seem to never change
	// * Bytes 8-13 seem to change, but not by much
	// * Bytes 14-39 seem to never change, and contains the ASCII string "Dummy"
	// * Bytes 40-55 Seem to change, maybe a hash like MD5? I couldn't find any combination of the message bytes that made this value though
	// TODO - Consume this?
});

function getLocalIPAddress(): string {
	if (process.env.PN_NNCS_LOCAL_IP_ADDRESS?.trim() && net.isIPv4(process.env.PN_NNCS_LOCAL_IP_ADDRESS)) {
		return process.env.PN_NNCS_LOCAL_IP_ADDRESS;
	}

	const networkInterfaces = os.networkInterfaces();

	for (const interfaceName in networkInterfaces) {
		for (const interfaceInfo of networkInterfaces[interfaceName]!) {
			if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
				return interfaceInfo.address;
			}
		}
	}

	return '127.0.0.1';
}

function handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	const message = {
		type: msg.readUInt32BE(0),
		externalPort: msg.readUInt32BE(4),
		externalAddress: msg.readUInt32BE(8),
		localAddress: msg.readUInt32BE(12)
	};

	const handler = HANDLERS[message.type];

	if (!handler) {
		// * Just do nothing if not a valid message type
		return;
	}

	handler(message, rinfo, socket);
}

function createResponse(message: NATMessage, rinfo: dgram.RemoteInfo): Buffer {
	const response = Buffer.alloc(16);

	response.writeUInt32BE(message.type, 0);
	response.writeUInt32BE(rinfo.port, 4);
	response.writeUInt32BE(ip2int(rinfo.address), 8);
	response.writeUInt32BE(LOCAL_IP_INT, 12);

	return response;
}

function handleMessageType1(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address and port.
	// * NEX uses this to check if the NAT check server is reachable at all,
	// * to measure the time that it takes to receive a response,
	// * and to figure out its own external IP address and port.
	socket.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function handleMessageType2(message: NATMessage, rinfo: dgram.RemoteInfo, _socket: dgram.Socket): void {
	// * The server replies from a different IP address and port.
	// * NEX uses this to determine the NAT filtering mode.
	// * "Different IP" means the other NNCS, which lives on another host: relay it there.
	const body = Buffer.alloc(22);
	createResponse(message, rinfo).copy(body, 0);
	body.writeUInt32BE(ip2int(rinfo.address), 16);
	body.writeUInt16BE(rinfo.port, 20);
	const mac = createHmac('sha256', RELAY_SECRET).update(body).digest();
	RELAY_SOCKET.send(Buffer.concat([mac, body]), RELAY_PORT, PEER_HOST);
}

function handleMessageType3(message: NATMessage, rinfo: dgram.RemoteInfo, _socket: dgram.Socket): void {
	// * The server replies from its regular IP address but from a different port.
	// * NEX uses this to determine the NAT filtering mode.
	ALTERNATE_SOCKET.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function handleMessageType4(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address and port.
	// * NEX uses this to determine the NAT mapping mode.
	socket.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function handleMessageType5(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address and port.
	// * NEX uses this to determine the NAT mapping mode.
	socket.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function handleMessageType101(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address and port.
	socket.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function handleMessageType102(message: NATMessage, rinfo: dgram.RemoteInfo, _socket: dgram.Socket): void {
	// * The server replies from its regular IP address but from a different port.
	ALTERNATE_SOCKET.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function handleMessageType103(message: NATMessage, rinfo: dgram.RemoteInfo, socket: dgram.Socket): void {
	// * The server replies from its regular IP address and port.
	socket.send(createResponse(message, rinfo), rinfo.port, rinfo.address);
}

function ip2int(ip: string): number {
	return Buffer.from(ip.split('.').map(Number)).readUInt32BE();
}

function int2ip(n: number): string {
	const b = Buffer.alloc(4);
	b.writeUInt32BE(n);
	return Array.from(b).join('.');
}
