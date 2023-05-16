class BinDataBlock {
  /**
   *
   * @param {Uint8Array} buffer Memory typed array
   * @param {number} length Data length
   * @param {number} blankSize
   */
  constructor(buffer, length, blankSize) {
    this.first = 0;
    this.last = 0;
    this.adr = 0;
    this.length = length;
    this.buffer = buffer;
    this.bound = blankSize;
  }

  getFirst() {
    return this.first;
  }

  getLast() {
    return this.last;
  }

  getLength() {
    return this.last - this.first + 1;
  }

  getNextBlock() {
    this.first = -1;
    this.last = -1;

    while (this.adr < this.length) {
      if (this.buffer[this.adr] !== 0xFF) {
        if (this.first < 0) {
          this.first = this.adr;
        }
        this.last = this.adr;
      } else {
        if (this.last > 0 && ((this.adr - this.last) > this.bound)) {
          return true;
        }
      }
      this.adr++;
    }

    return this.last > 0 || this.adr < this.length;
  }
}

module.exports = { BinDataBlock }
