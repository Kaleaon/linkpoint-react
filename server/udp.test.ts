import assert from "node:assert/strict";
import test from "node:test";
import { getOrCreateSession } from "./sl";
import { decodeRegionHandshakeMessage, generateAuthenticSimUdpPackets } from "./udp";

function getRegionHandshakePacket() {
  const session = getOrCreateSession("udp-region-handshake-test");
  session.regionName = "Protocol Test Region";
  return generateAuthenticSimUdpPackets(session).find(
    (packet) => packet.length >= 9 && packet[5] === 0xff && packet[6] === 0xff && packet.readUInt16BE(7) === 0x000f
  );
}

test("decodes full simulator info from RegionHandshake packets", () => {
  const packet = getRegionHandshakePacket();
  assert.ok(packet, "expected a generated RegionHandshake packet");

  const info = decodeRegionHandshakeMessage(packet, "Fallback Region");
  assert.ok(info, "expected simulator info to decode");
  assert.equal(info.simName, "Protocol Test Region");
  assert.equal(info.access.label, "moderate");
  assert.equal(info.blocks.regionInfo2, true);
  assert.equal(info.blocks.regionInfo3, true);
  assert.equal(info.blocks.regionInfo4, true);
  assert.equal(info.isPartial, false);
  assert.equal(info.productName, "Mainland Full Region");
  assert.deepEqual(info.terrain.startHeightsMeters, {
    "00": 20,
    "01": 22,
    "10": 24,
    "11": 26,
  });
  assert.ok(info.regionFlags.names.includes("sandbox"));
  assert.ok(info.protocols.names.includes("self_appearance_support"));
});

test("gracefully marks truncated simulator info payloads as partial", () => {
  const packet = getRegionHandshakePacket();
  assert.ok(packet, "expected a generated RegionHandshake packet");

  const truncated = packet.subarray(0, 48);
  const info = decodeRegionHandshakeMessage(truncated, "Fallback Region");
  assert.ok(info, "expected partial simulator info from truncated packet");
  assert.equal(info.isPartial, true);
  assert.equal(info.blocks.regionInfo2, false);
  assert.equal(info.blocks.regionInfo3, false);
  assert.equal(info.blocks.regionInfo4, false);
  assert.equal(info.simName, "Protocol Test Region");
});
