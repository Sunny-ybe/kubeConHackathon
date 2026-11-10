// Minimal .zip writer for the browser (SPEC §15): stored (no compression, photos and videos
// are already compressed), CRC-32, UTF-8 names, no dependencies. Add files one at a time, so
// callers can fetch, add and drop each file's bytes as they go; finish() returns the Blob.
// No Zip64: fine below 4 GB and 65,535 files (we cap downloads at MAX_DOWNLOAD_ITEMS).

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** MS-DOS time and date words (local time, 2-second resolution, 1980 or later). */
function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

const UTF8_FLAG = 0x0800;

export class ZipWriter {
  private parts: BlobPart[] = [];
  private central: Uint8Array[] = [];
  private offset = 0;
  private count = 0;
  private names = new Set<string>();

  /** Add one file. Duplicate names get " (2)", " (3)"… before the extension. */
  add(name: string, data: Uint8Array, modified = new Date()): void {
    const unique = this.uniqueName(name);
    const nameBytes = new TextEncoder().encode(unique);
    const crc = crc32(data);
    const { time, date } = dosDateTime(modified);
    const size = data.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // local file header signature
    local.setUint16(4, 20, true); // version needed (2.0)
    local.setUint16(6, UTF8_FLAG, true);
    local.setUint16(8, 0, true); // method: stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true); // compressed size
    local.setUint32(22, size, true); // uncompressed size
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true); // extra length

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); // central directory signature
    cd.setUint16(4, 20, true); // version made by
    cd.setUint16(6, 20, true); // version needed
    cd.setUint16(8, UTF8_FLAG, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, time, true);
    cd.setUint16(14, date, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, size, true);
    cd.setUint32(24, size, true);
    cd.setUint16(28, nameBytes.length, true);
    // extra, comment, disk start, internal attrs, external attrs: all 0
    cd.setUint32(42, this.offset, true); // local header offset

    this.parts.push(local.buffer, nameBytes as BlobPart, data as BlobPart);
    this.central.push(new Uint8Array(cd.buffer), nameBytes);
    this.offset += 30 + nameBytes.length + size;
    this.count++;
  }

  get size(): number {
    return this.count;
  }

  /** The finished archive. The writer should not be used afterwards. */
  finish(): Blob {
    const cdSize = this.central.reduce((n, b) => n + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); // end of central directory signature
    end.setUint16(8, this.count, true); // entries on this disk
    end.setUint16(10, this.count, true); // entries total
    end.setUint32(12, cdSize, true);
    end.setUint32(16, this.offset, true); // central directory offset
    return new Blob([...this.parts, ...(this.central as BlobPart[]), end.buffer], { type: "application/zip" });
  }

  private uniqueName(name: string): string {
    let candidate = name;
    const dot = name.lastIndexOf(".");
    const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
    for (let i = 2; this.names.has(candidate); i++) candidate = `${base} (${i})${ext}`;
    this.names.add(candidate);
    return candidate;
  }
}
