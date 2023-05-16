const fs = require("fs")
const { BinDataBlock } = require('./BinDataBlock')
const {
    CMD_CONNECT,
    CMD_DEC_COUNTER,
    CMD_DISCONNECT,
    CMD_EEPROM,
    CMD_END,
    CMD_FLASH,
    CMD_SPI_VERIFY,
    CMD_SPI_WRITE,
    CMD_WAIT
} = require('../enums')
const { TARGET_MEMORY_SIZE, SCK_OPTIONS } = require('../config')
const { HexFile } = require('./HexFile')

class ISPScript {

    /**
     * Converts number to 10 system
     * @param s Input number
     * @return {number}
     */
    static getIntVal(s) {
        let base = 10;
        s = s.trim();

        if (s.length > 2 && s.substring(0, 2) === "0x") {
            base = 16;
            s = s.substring(2);
        }

        return parseInt(s, base);
    }

    /**
     * Returns nearest available SCK number
     * @param {number} frequency Input frequency
     * @return {number}
     */
    static getNearestSCKOption(frequency) {
        let useDiff = 8000000;
        let useIndex = 3;

        for (let i = 0; i < SCK_OPTIONS.length; i++) {
            let diff = frequency - SCK_OPTIONS[i];
            if (diff < 0) continue;

            if (diff < useDiff) {
                useDiff = diff;
                useIndex = i;
            }
        }

        return useIndex;
    }

    /**
     * Parses given script and concatenates filrmware
     * @param {string} scriptData Script file content
     * @param {Uint8Array} mem Memory typed array
     * @param {number} pos Start position
     * @return {number}
     */
    static parse(scriptData, mem, pos) {
        const lines = scriptData
            .split('\n')
            .map(x => x.trim())

        for (let lineno = 0; lineno < lines.length; lineno++) {
            const line = lines[lineno]

            if (line.split(";").length === 0) continue;
            let lineHead = line
                .split(";")[0]
                .trim();
            if (lineHead === "") continue;
            let lineParts = lineHead
                .split(" ");

            const cmd = lineParts[0].toUpperCase();
            let parameters = null;
            if (lineParts.length > 1) {
                parameters = lineHead
                    .substring(cmd.length)
                    .split(",");
            }

            switch (cmd) {
                case "CONNECT":
                    mem[pos++] = CMD_CONNECT;
                    mem[pos++] = ISPScript.getNearestSCKOption(ISPScript.getIntVal(parameters[0]));
                    break;
                case "DISCONNECT":
                    mem[pos++] = CMD_DISCONNECT;
                    break;
                case "SPI_WRITE":
                    mem[pos++] = CMD_SPI_WRITE;
                    mem[pos++] = ISPScript.getIntVal(parameters[0]);
                    mem[pos++] = ISPScript.getIntVal(parameters[1]);
                    mem[pos++] = ISPScript.getIntVal(parameters[2]);
                    mem[pos++] = ISPScript.getIntVal(parameters[3]);
                    break;
                case "SPI_VERIFY":
                    mem[pos++] = CMD_SPI_VERIFY;
                    mem[pos++] = ISPScript.getIntVal(parameters[0]);
                    mem[pos++] = ISPScript.getIntVal(parameters[1]);
                    mem[pos++] = ISPScript.getIntVal(parameters[2]);
                    mem[pos++] = ISPScript.getIntVal(parameters[3]);
                    mem[pos++] = ISPScript.getIntVal(parameters[4]);
                    break;
                case "FLASH":
                case "EEPROM":
                    const filename = parameters[0]
                        .trim()

                    const pageSize = ISPScript.getIntVal(parameters[2])
                    const startAddress = ISPScript.getIntVal(parameters[1])
                    let blankSize = 64;
                    if (pageSize * 2 > blankSize) blankSize = pageSize * 2

                    const hexMemory = new Uint8Array(TARGET_MEMORY_SIZE)
                    hexMemory.fill(0xFF)

                    const firmwareData = fs.readFileSync(filename, 'utf8')
                    const length = HexFile.read(firmwareData, hexMemory, 0)
                    const block = new BinDataBlock(hexMemory, length, blankSize)

                    while (block.getNextBlock()) {
                        mem[pos++] = cmd === "FLASH" ? CMD_FLASH : CMD_EEPROM

                        mem[pos++] = (startAddress + block.getFirst() >> 24) & 0xff
                        mem[pos++] = (startAddress + block.getFirst() >> 16) & 0xff
                        mem[pos++] = (startAddress + block.getFirst() >> 8) & 0xff
                        mem[pos++] = (startAddress + block.getFirst()) & 0xff
                        mem[pos++] = (block.getLength() >> 24) & 0xff
                        mem[pos++] = (block.getLength() >> 16) & 0xff
                        mem[pos++] = (block.getLength() >> 8) & 0xff
                        mem[pos++] = block.getLength() & 0xff
                        mem[pos++] = (pageSize >> 8) & 0xff
                        mem[pos++] = pageSize & 0xff

                        mem.set(hexMemory.subarray(
                                block.getFirst(),
                                block.getFirst() + block.getLength()
                        ), pos);

                        pos += block.getLength();
                    }
                    break;
                case "WAIT":
                    mem[pos++] = CMD_WAIT;
                    mem[pos++] = ISPScript.getIntVal(parameters[0]);
                    break;
                case "DEC_COUNTER":
                    mem[pos++] = CMD_DEC_COUNTER;
                    const counter = ISPScript.getIntVal(parameters[0])
                    mem[pos++] = (counter >> 8) & 0xff
                    mem[pos++] = counter & 0xff
                    break;
                case "END":
                    mem[pos++] = CMD_END;
                    break;
                default:
                    console.log(`Unknown command "${cmd}" in line ${lineno}.`)
                    break;
            }
        }

        return pos
    }
}

module.exports = { ISPScript }
