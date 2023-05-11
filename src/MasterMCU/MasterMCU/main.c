#define F_CPU 8000000

#include <avr/io.h>
#include <avr/cpufunc.h>
#include <stdint.h>
#include <stdbool.h>
#include <avr/interrupt.h>
#include <util/delay.h>
#include "main.h"

void InitBus () {
	DDRD |= _SET(PD3); // Clock
	DDRD |= _SET(PD4); // DATA 1
	DDRD |= _SET(PD5); // DATA 2
	DDRD |= _SET(PD6); // DATA 3
	DDRD |= _SET(PD7); // DATA 4
	PORTD &=  _CLR(PD3) | _CLR(PD4) | _CLR(PD5) | _CLR(PD6) | _CLR(PD7);
}

void clockBus () {
	PORTD |= _SET(PD3);
	_delay_us(150);
	PORTD &= _CLR(PD3);
}

void busTransferByte (uint8_t data) {
	PORTD = (data & 0b00001111) << 4;
	clockBus();
	PORTD = (data & 0b11110000);
	clockBus();
}

uint8_t n = 0;
int main(void)
{
	InitBus();
    _delay_ms(200);

    while (1) 
    {
		busTransferByte ((1 << n++));
		if (n == 8) { n = 0; }		
    }
}

