#ifndef BLE_COMMON_IMPL_H__
#define BLE_COMMON_IMPL_H__

#include <functional>
#include "adapter.h"
#include <stdint.h>

typedef std::function<uint32_t(uint8_t*, uint32_t*)> encode_function_t;
typedef std::function<uint32_t(uint8_t*, uint32_t, uint32_t*)> decode_function_t;

uint32_t encode_decode(adapter_t *adapter, encode_function_t encode_function, decode_function_t decode_function);

#endif

