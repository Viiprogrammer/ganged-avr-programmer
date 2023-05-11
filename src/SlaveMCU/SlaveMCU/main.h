#ifndef MAIN_H_
#define MAIN_H_

/* Set bit macro, use as val |= _SET(bit) */
#define _SET(x) (1 << (x))
/* Clear bit macro, use as val &= _CLR(bit) */
#define _CLR(x) (~_SET(x))

#endif /* MAIN_H_ */
