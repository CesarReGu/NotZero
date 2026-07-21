export type ZipEntry = { path: string; text: string };

// CRC-32 table, built once. ZIP requires the checksum in both the local header
// and the central directory.
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writer(size: number) {
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  return {
    bytes,
    get offset() { return offset; },
    u16(value: number) { view.setUint16(offset, value, true); offset += 2; },
    u32(value: number) { view.setUint32(offset, value, true); offset += 4; },
    raw(value: Uint8Array) { bytes.set(value, offset); offset += value.length; },
  };
}

/**
 * Builds a ZIP archive with the stored (uncompressed) method. The package holds
 * small text documents, so skipping DEFLATE keeps this dependency-free without a
 * meaningful size cost.
 */
export function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const prepared = entries.map((entry) => {
    const name = encoder.encode(entry.path);
    const data = encoder.encode(entry.text);
    return { name, data, crc: crc32(data) };
  });

  const LOCAL_HEADER = 30;
  const CENTRAL_HEADER = 46;
  const END_RECORD = 22;
  const localSize = prepared.reduce((total, item) => total + LOCAL_HEADER + item.name.length + item.data.length, 0);
  const centralSize = prepared.reduce((total, item) => total + CENTRAL_HEADER + item.name.length, 0);
  const out = writer(localSize + centralSize + END_RECORD);

  const offsets: number[] = [];
  for (const item of prepared) {
    offsets.push(out.offset);
    out.u32(0x04034b50);
    out.u16(20);            // version needed
    out.u16(0x0800);        // UTF-8 filename flag
    out.u16(0);             // stored
    out.u16(0);             // mod time
    out.u16(0);             // mod date
    out.u32(item.crc);
    out.u32(item.data.length);
    out.u32(item.data.length);
    out.u16(item.name.length);
    out.u16(0);             // extra field length
    out.raw(item.name);
    out.raw(item.data);
  }

  const centralStart = out.offset;
  for (const [index, item] of prepared.entries()) {
    out.u32(0x02014b50);
    out.u16(20);            // version made by
    out.u16(20);            // version needed
    out.u16(0x0800);
    out.u16(0);
    out.u16(0);
    out.u16(0);
    out.u32(item.crc);
    out.u32(item.data.length);
    out.u32(item.data.length);
    out.u16(item.name.length);
    out.u16(0);             // extra
    out.u16(0);             // comment
    out.u16(0);             // disk number
    out.u16(0);             // internal attributes
    out.u32(0);             // external attributes
    out.u32(offsets[index]);
    out.raw(item.name);
  }

  // Capture the directory size before the end record starts advancing offset.
  const centralSizeWritten = out.offset - centralStart;
  out.u32(0x06054b50);
  out.u16(0);             // this disk
  out.u16(0);             // disk with central directory
  out.u16(prepared.length);
  out.u16(prepared.length);
  out.u32(centralSizeWritten);
  out.u32(centralStart);
  out.u16(0);             // archive comment length

  return new Blob([out.bytes], { type: "application/zip" });
}
