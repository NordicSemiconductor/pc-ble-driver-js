#include "ble_common.h"

#include <memory>
#include "adapter_internal.h"
#include "nrf_error.h"
#include "ser_config.h"

uint32_t encode_decode(adapter_t *adapter, encode_function_t encode_function, decode_function_t decode_function)
{
    uint32_t tx_buffer_length = SER_HAL_TRANSPORT_MAX_PKT_SIZE;
    uint32_t rx_buffer_length = 0;

    std::unique_ptr<uint8_t> tx_buffer(static_cast<uint8_t*>(std::malloc(SER_HAL_TRANSPORT_MAX_PKT_SIZE)));
    std::unique_ptr<uint8_t> rx_buffer(static_cast<uint8_t*>(std::malloc(SER_HAL_TRANSPORT_MAX_PKT_SIZE)));

    auto _adapter = static_cast<Adapter*>(adapter->internal);

    uint32_t err_code = encode_function(tx_buffer.get(), &tx_buffer_length);

    // TODO: implement error callback
    if (_adapter->isInternalError(err_code))
    {
        return NRF_ERROR_INTERNAL;
    }

    if (decode_function != nullptr)
    {
        err_code = _adapter->transport->send(
            tx_buffer.get(),
            tx_buffer_length,
            rx_buffer.get(),
            &rx_buffer_length);
    }
    else
    {
        err_code = _adapter->transport->send(
            tx_buffer.get(),
            tx_buffer_length,
            nullptr,
            &rx_buffer_length);
    }

    // TODO: implement error callback
    if (_adapter->isInternalError(err_code))
    {
        return NRF_ERROR_INTERNAL;
    }

    uint32_t result_code = NRF_SUCCESS;

    if (decode_function != nullptr)
    {
        err_code = decode_function(rx_buffer.get(), rx_buffer_length, &result_code);
    }

    // TODO: implement error callback

    if (_adapter->isInternalError(err_code))
    {
        return NRF_ERROR_INTERNAL;
    }

    return result_code;
}
