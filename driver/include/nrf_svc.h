#ifndef NRF_SVC__
#define NRF_SVC__

#include "adapter.h"

// TODO: Remove SVCALL from all code

#define SVCALL(number, return_type, signature) return_type signature

#endif  // NRF_SVC__