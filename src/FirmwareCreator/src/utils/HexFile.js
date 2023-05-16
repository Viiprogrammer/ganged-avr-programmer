const fs = require('fs')
const {
    RECORD_TYPE_DATA,
    RECORD_TYPE_EOF,
    RECORD_TYPE_SEGMENT_START_ADDRESS,
    RECORD_TYPE_EXT_SEGMENT_ADDRESS,
    RECORD_TYPE_EXT_LINEAR_ADDRESS
} = require("../enums");

const RADIX = 16;
const EOL = "\r\n"

class HexFile {
    /**
     * @param {string} data File data
     * @param {Uint8Array} memoryBuffer Memory typed array
     * @param {number} offset Read offset
     * @return {number} End address
     */
    static read(data, memoryBuffer, offset) {
        const lines = data
            .split('\n')
            .map(line => line.trim())
            .filter(x => x !== '')

        let extendedAddress = 0
        let segmentAddress = 0
        let endAddress = 0

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const record = lines[lineNum]
            const dataLength = parseInt(record.substring(1, 3), RADIX)
            let address = parseInt(record.substring(3, 7), RADIX)
            const recordType = parseInt(record.substring(7, 9), RADIX)

            // Checksum
            let sum = new Uint8Array([0]);
            for (let i = 0; i < dataLength + 5; i++) {
                sum[0] += parseInt(record.substring(i * 2 + 1, (i * 2 + 3)), RADIX)
            }

            if (sum[0] !== 0) {
                throw new TypeError("Invalid checksum in line " + lineNum)
            }

            switch (recordType) {
                case RECORD_TYPE_DATA:

                    for (let i = 0; i < dataLength; i++) {
                        let value = new Uint8Array([0])
                        value = parseInt(record.substring(i * 2 + 9, i * 2 + 11), RADIX)
                        memoryBuffer[offset + address + extendedAddress + segmentAddress] = value

                        if (address + extendedAddress + segmentAddress > endAddress) {
                            endAddress = address + extendedAddress + segmentAddress
                        }
                        address++
                    }

                    break;
                case RECORD_TYPE_EOF:
                    break;
                case RECORD_TYPE_EXT_LINEAR_ADDRESS:
                    extendedAddress = parseInt(record.substring(9, 13), 16) << 16
                    break;
                case RECORD_TYPE_EXT_SEGMENT_ADDRESS:
                    segmentAddress = parseInt(record.substring(9, 13), 16) << 4
                    break;
                case RECORD_TYPE_SEGMENT_START_ADDRESS:
                    // ignore start address
                    break;
                default:
                    console.log("Unknown record type in line " + lineNum + ": " + recordType);
                    break;
            }
        }

        return endAddress + 1
    }

    /**
     *
     * @param {string} filename Filename for result
     * @param {Uint8Array} memoryBuffer Memory typed array with firmware
     * @param {number} length Length to write
     */
    static write(filename, memoryBuffer, length) {
        let outResult = ''
        let upperAddress = 0
        let bytesLeft = length
        let position = 0

        while (bytesLeft > 0) {
            let len = bytesLeft
            if (len > 16) {
                len = 16
            }

            if (upperAddress !== (position >> 16)) {
                // printout upper address
                upperAddress = position >> 16
                let cs = new Uint8Array([0])
                cs[0] = 0xff - ((1 + 4 + (upperAddress >> 8) + (upperAddress & 0xFF)) & 0xFF)

                const part1 = upperAddress
                    .toString(16)
                    .padStart(4, '0')

                const part2 = cs
                    .toString(16)
                    .padStart(2, '0');

                outResult += ':02000004' + part1 + part2 + EOL
            }

            let ignore = true;
            let outString = ":";
            outString += len
                .toString(16)
                .padStart(2, '0')
                .toUpperCase()

            outString += (position & 0xFFFF)
                .toString(16)
                .padStart(4, '0')
                .toUpperCase() + "00"

            let checksum = new Uint8Array([0]);
            checksum[0] = len + ((position >> 8) & 0xFF) + (position & 0xFF)
            for (let i = 0; i < len; i++) {
                if (memoryBuffer[position] !== 0xFF) {
                    ignore = false
                }

                outString += memoryBuffer[position]
                    .toString(16)
                    .padStart(2, '0')
                    .toUpperCase()

                checksum[0] += memoryBuffer[position]
                position++
            }

            checksum[0] = -checksum[0];
            outString += checksum[0]
                .toString(16)
                .padStart(2, '0')
                .toUpperCase()

            if (!ignore) {
                outResult += outString + EOL
            }

            bytesLeft = bytesLeft - len
        }

        outResult += ":00000001FF" + EOL;
        fs.writeFileSync(filename, outResult)
    }
}


module.exports = { HexFile }
