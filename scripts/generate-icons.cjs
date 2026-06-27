const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function createSimplePNG(size) {
  const width = size
  const height = size
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8
  ihdrData[9] = 2
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0

  const ihdr = createChunk('IHDR', ihdrData)

  const rawData = []
  for (let y = 0; y < height; y++) {
    rawData.push(0)
    for (let x = 0; x < width; x++) {
      rawData.push(5, 150, 105)
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawData))
  const idat = createChunk('IDAT', compressed)
  const iend = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcData), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons')

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createSimplePNG(192))
console.log('Created icon-192.png')

fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createSimplePNG(512))
console.log('Created icon-512.png')