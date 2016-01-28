/* Copyright (c) 2015 Nordic Semiconductor. All Rights Reserved.
*
* The information contained herein is property of Nordic Semiconductor ASA.
* Terms and conditions of usage are described in detail in NORDIC
* SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
*
* Licensees are granted free, non-transferable use of the information. NO
* WARRANTY of ANY KIND is provided. This heading must NOT be removed from
* the file.
*
*/

#include <memory>
#include <cstdlib>

#include "ble.h"
#include <stdint.h>
#include "ble_app.h"
#include "app_ble_user_mem.h"
#include "adapter_internal.h"

#include "ble_common.h"

/**@brief Structure containing @ref sd_ble_uuid_encode output parameters. */
typedef struct
{
    uint8_t * p_uuid_le_len; /**< @ref sd_ble_uuid_encode appearance p_uuid_le_len output parameter. */
    uint8_t * p_uuid_le;     /**< @ref sd_ble_uuid_encode appearance p_uuid_le output parameter. */
} ble_uuid_encode_out_params_t;

/**@brief Structure containing @ref sd_ble_tx_buffer_count_get output parameters. */
typedef struct
{
    uint8_t * p_count; /**< @ref sd_ble_tx_buffer_count_get p_count output parameter. */
} ble_tx_buffer_count__get_out_params_t;

/**@brief Structure containing @ref sd_ble_user_mem_reply output parameters. */
typedef struct
{
    uint16_t conn_handle;       /**< @ref sd_ble_user_mem_reply conn_handle. */
    uint8_t  context_allocated; /**< @ref sd_ble_user_mem_reply user memory context allocated flag. */
} ble_user_mem_reply_out_params_t;

/**@brief Union containing BLE command output parameters. */
typedef union
{
    ble_uuid_encode_out_params_t          ble_uuid_encode_out_params;         /**< @ref sd_ble_uuid_encode output parameters. */
    ble_tx_buffer_count__get_out_params_t ble_tx_buffer_count_get_out_params; /**< @ref sd_ble_uuid_encode output parameters. */
    ble_user_mem_reply_out_params_t       ble_user_mem_reply_out_params;      /**< @ref sd_ble_user_mem_reply output parameters. */
} ble_command_output_params_t;

uint32_t sd_ble_uuid_encode(adapter_t* adapter, ble_uuid_t const * const p_uuid,
    uint8_t * const          p_uuid_le_len,
    uint8_t * const          p_uuid_le)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_uuid_encode_req_enc(
            p_uuid,
            p_uuid_le_len,
            p_uuid_le,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_uuid_encode_rsp_dec(
            buffer,
            length,
            p_uuid_le_len,
            p_uuid_le,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_tx_buffer_count_get(adapter_t *adapter, uint8_t * p_count)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_tx_buffer_count_get_req_enc(
            p_count,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_tx_buffer_count_get_rsp_dec(
            buffer,
            length,
            reinterpret_cast<uint8_t * *>(&p_count),
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_uuid_vs_add(adapter_t *adapter, ble_uuid128_t const * const p_vs_uuid, uint8_t * const p_uuid_type)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_uuid_vs_add_req_enc(
        p_vs_uuid,
        p_uuid_type,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_uuid_vs_add_rsp_dec(
            buffer,
            length,
            const_cast<uint8_t**>(&p_uuid_type),
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_uuid_decode(adapter_t *adapter, uint8_t               uuid_le_len,
    uint8_t const * const p_uuid_le,
    ble_uuid_t * const    p_uuid)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_uuid_decode_req_enc(
            uuid_le_len,
            p_uuid_le,
            p_uuid,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_uuid_decode_rsp_dec(
            buffer,
            length,
            const_cast<ble_uuid_t * *>(&p_uuid),
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_version_get(adapter_t *adapter, ble_version_t * p_version)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_version_get_req_enc(
        p_version,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_version_get_rsp_dec(
            buffer,
            length,
            static_cast<ble_version_t *>(p_version),
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_opt_get(adapter_t *adapter, uint32_t opt_id, ble_opt_t *p_opt)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_opt_get_req_enc(
        opt_id,
        p_opt,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        uint32_t uint32_param;

        uint32_t err_code = ble_opt_get_rsp_dec(
            buffer,
            length,
            &uint32_param,
            static_cast<ble_opt_t *>(p_opt),
            result);

        return err_code;
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_opt_set(adapter_t *adapter, uint32_t opt_id, ble_opt_t const *p_opt)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_opt_set_req_enc(
            opt_id,
            p_opt,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_opt_set_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_enable(adapter_t *adapter, ble_enable_params_t * p_params)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_enable_req_enc(
            p_params,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_enable_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

#if 0 // TODO: evaluate if this is needed
/**@brief Command response callback function for @ref sd_ble_user_mem_reply BLE command.
*
* Callback for decoding the output parameters and the command response return code.
*
* @param[in] p_buffer  Pointer to begin of command response buffer.
* @param[in] length    Length of data in bytes.
*
* @return Decoded command response return code.
*/
static uint32_t user_mem_reply_rsp_dec(const uint8_t * p_buffer, uint16_t length)
{
    uint32_t result_code;

    uint32_t err_code = ble_user_mem_reply_rsp_dec(p_buffer,
        length,
        &result_code);
    APP_ERROR_CHECK(err_code);

    if ((result_code != NRF_SUCCESS) &&
        (m_output_params.ble_user_mem_reply_out_params.context_allocated))
    {
        err_code = app_ble_user_mem_context_destroy(
            m_output_params.ble_user_mem_reply_out_params.conn_handle);
        SER_ASSERT(err_code == NRF_SUCCESS, err_code);
    }

    return result_code;
}

uint32_t sd_ble_user_mem_reply(uint16_t conn_handle, ble_user_mem_block_t const *p_block)
{
    uint8_t * p_buffer;
    uint32_t  buffer_length, user_mem_table_index;
    uint32_t  err_code = NRF_SUCCESS;

    tx_buf_alloc(&p_buffer, &buffer_length);

    // Prepare User Memory Block context for later synchronization when SoftDevice updates
    // the data in the memory block
    if (p_block != NULL)
    {
        err_code = app_ble_user_mem_context_create(conn_handle, &user_mem_table_index);
        SER_ASSERT(err_code == NRF_SUCCESS, err_code);
        m_app_user_mem_table[user_mem_table_index].mem_block.len = p_block->len;
        m_app_user_mem_table[user_mem_table_index].mem_block.p_mem = p_block->p_mem;
        // Save connection handle and context allocation flag for case if context destroy was needed
        m_output_params.ble_user_mem_reply_out_params.conn_handle = conn_handle;
        m_output_params.ble_user_mem_reply_out_params.context_allocated = 1;
    }
    else
    {
        m_output_params.ble_user_mem_reply_out_params.context_allocated = 0;
    }

    err_code = ble_user_mem_reply_req_enc(conn_handle,
        p_block,
        &(p_buffer[1]),
        &buffer_length);
    APP_ERROR_CHECK(err_code);

    //@note: Increment buffer length as internally managed packet type field must be included.
    return ser_sd_transport_cmd_write(p_buffer,
        (++buffer_length),
        user_mem_reply_rsp_dec);
}
#endif
