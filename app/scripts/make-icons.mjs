import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

function crc32(buf) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function makePng(size, [r, g, b], [fr, fg, fb], marginRatio) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const margin = Math.round(size * marginRatio)
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3)
    raw[rowStart] = 0 // filter type none
    const inside = y >= margin && y < size - margin
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3
      const insideX = x >= margin && x < size - margin
      if (inside && insideX) {
        raw[px] = fr; raw[px + 1] = fg; raw[px + 2] = fb
      } else {
        raw[px] = r; raw[px + 1] = g; raw[px + 2] = b
      }
    }
  }
  const idat = deflateSync(raw)
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const bg = [24, 27, 33] // dark background approx oklch(0.16 0.015 255)
const fg = [61, 199, 158] // green approx oklch(0.72 0.13 155)

writeFileSync(new URL('../public/pwa-192.png', import.meta.url), makePng(192, bg, fg, 0.28))
writeFileSync(new URL('../public/pwa-512.png', import.meta.url), makePng(512, bg, fg, 0.28))
console.log('Iconos PWA generados.')
