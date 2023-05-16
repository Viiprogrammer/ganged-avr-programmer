const fs = require('fs')
const path = require('path')
const { hideBin } = require("yargs/helpers");
const yargs = require('yargs/yargs')
const { HexFile, ISPScript } = require('./utils')
const { SCRIPT_START_ADDRESS, UC_MEMORY_SIZE } = require('./config')


const { script, output, main } = yargs(hideBin(process.argv))
    .option('script', {
        alias: 's',
        description: 'script file',
        type: 'string'
    })
    .option('output', {
        alias: 'o',
        description: 'output firmware hex file',
        default: 'result.hex',
        type: 'string'
    })
    .option('main', {
        alias: 'm',
        description: 'input main firmware hex file in injection',
        type: 'string'
    })
    .help()
    .parse()

const scriptData = fs.readFileSync(path.resolve(script), 'utf8')
const mainData = fs.readFileSync(main, 'utf8')
const mem = new Uint8Array(UC_MEMORY_SIZE)
    .fill(0xFF)

// Read in the main hex file and place it on start of flash memory
HexFile.read(mainData, mem, 0)
const lastPosition = ISPScript.parse(scriptData, mem, SCRIPT_START_ADDRESS)
HexFile.write(output, mem, lastPosition)
console.log('Done.')
