#define F_CPU 8000000

#define SPI_PORTX PORTB
#define SPI_DDRX DDRB

#define SPI_MISO 4
#define SPI_MOSI 3
#define SPI_SCK 5
#define SPI_SS 2

#include <avr/io.h>
#include <avr/cpufunc.h>
#include <stdint.h>
#include <stdbool.h>
#include <avr/interrupt.h>
#include <util/delay.h>
#include "main.h"

volatile uint8_t nubbleNum = 0;
volatile uint8_t buffer = 0;
volatile bool received = false;

ISR (INT1_vect) {
	if (nubbleNum == 0) {
		buffer = (PIND & 0b11110000) >> 4;
		nubbleNum = 1;
	} else {
		buffer |= PIND & 0b11110000;
		nubbleNum = 0;
		received = true;
	}
}

void InitInterrupts () {
	EICRA |= _SET(ISC11);
	EICRA |= _SET(ISC10);
	EIMSK |= _SET(INT1);
}

void InitBus () {
	DDRD &= _CLR(PD3); // Clock
	DDRD &= _CLR(PD4); // DATA 1
	DDRD &= _CLR(PD5); // DATA 2
	DDRD &= _CLR(PD6); // DATA 3
	DDRD &= _CLR(PD7); // DATA 4
	PORTD |=  _SET(PD3) | _SET(PD4) | _SET(PD5) | _SET(PD6) | _SET(PD7);
}

void SPIInit(void)
{
   SPI_DDRX |= _SET(SPI_MOSI) | _SET(SPI_SCK) | _SET(SPI_SS);
   SPI_DDRX &= _CLR(SPI_MISO);
   SPI_PORTX |= _SET(SPI_MOSI)| _SET(SPI_SCK) | _SET(SPI_SS) | _SET(SPI_MISO);

   SPCR |= _SET(SPE) | _SET(MSTR) | _SET(SPR1) | _SET(SPR0);
   SPCR &= _CLR(DORD) | _CLR(CPOL) | _CLR(CPHA) | _CLR(CPHA);
   SPSR &= _CLR(SPI2X);
}

uint8_t SPI_WriteByte(uint8_t data)
{
	SPI_PORTX &= _CLR(SPI_SS);
	SPDR = data;
	while(!(SPSR & _SET(SPIF)));
	SPI_PORTX |= _SET(SPI_SS);
	return SPDR;
}

int main(void)
{
	InitBus();
	InitInterrupts();
	SPIInit();
	DDRC = 0xFF;
	sei();
    while (1)
    {
		if (received) {
	      SPI_WriteByte(buffer);
		  PORTC = buffer;
		  received = false;
		  buffer = 0;
		}
    }
}

