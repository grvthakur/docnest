export function sha256(message) {
  function utf8Encode(str) {
    return unescape(encodeURIComponent(str));
  }
  function rotr(x, n) {
    return (x >>> n) | (x << (32 - n));
  }
  function ch(x, y, z) {
    return (x & y) ^ (~x & z);
  }
  function maj(x, y, z) {
    return (x & y) ^ (x & z) ^ (y & z);
  }
  function bsig0(x) {
    return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
  }
  function bsig1(x) {
    return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
  }
  function ssig0(x) {
    return rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
  }
  function ssig1(x) {
    return rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);
  }

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const msg = utf8Encode(message);
  const msgLen = msg.length;
  const bitLen = msgLen * 8;
  const tailLen = msgLen % 64;
  const padLen = tailLen < 56 ? 56 - tailLen : 120 - tailLen;
  const totalLen = msgLen + padLen + 8;
  const buf = new ArrayBuffer(totalLen);
  const view = new DataView(buf);
  for (let i = 0; i < msgLen; i++) view.setUint8(i, msg.charCodeAt(i));
  view.setUint8(msgLen, 0x80);
  view.setUint32(totalLen - 8, 0, false);
  view.setUint32(totalLen - 4, bitLen, false);

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];
  const w = new Uint32Array(64);

  // Read each 32-bit word directly from the DataView in big-endian order.
  // (Using a Uint32Array view of the buffer instead would read words in the
  // platform's native — usually little-endian — byte order, silently
  // producing an incorrect hash.)
  for (let i = 0; i < totalLen; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      w[j] = (ssig1(w[j - 2]) + w[j - 7] + ssig0(w[j - 15]) + w[j - 16]) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let j = 0; j < 64; j++) {
      const temp1 = (h + bsig1(e) + ch(e, f, g) + K[j] + w[j]) >>> 0;
      const temp2 = (bsig0(a) + maj(a, b, c)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map((h) => ("00000000" + h.toString(16)).slice(-8)).join("");
}
