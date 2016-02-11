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

// C++ code
#include "adapter.h"
#include "ble_common.h"

#include <cstring>

// C code
#include "ble_gap.h"
#include "ble_gap_app.h" // Encoder/decoder functions

//TODO: Find a way to support multiple adapters
#include "app_ble_gap_sec_keys.h" // m_app_keys_table and app_ble_gap_sec_context_create 

#include <stdint.h>

extern ser_ble_gap_app_keyset_t m_app_keys_table[SER_MAX_CONNECTIONS];

uint32_t sd_ble_gap_adv_start(adapter_t *adapter, ble_gap_adv_params_t const * const p_adv_params)
{
    encode_function_t encode_function = [&] (uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_adv_start_req_enc(
            p_adv_params,
            buffer,
            length);
    };

    decode_function_t decode_function = [&] (uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_adv_start_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}


uint32_t sd_ble_gap_device_name_get(adapter_t *adapter, uint8_t * const p_dev_name, uint16_t * const p_len)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_device_name_get_req_enc(
            p_dev_name,
            p_len,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_device_name_get_rsp_dec(
            buffer,
            length,
            p_dev_name,
            p_len,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_appearance_get(adapter_t *adapter, uint16_t * const p_appearance)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_appearance_get_req_enc(
            p_appearance,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_appearance_get_rsp_dec(
            buffer,
            length,
            p_appearance,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_device_name_set(adapter_t *adapter, ble_gap_conn_sec_mode_t const * const p_write_perm,
    uint8_t const * const                 p_dev_name,
    uint16_t                              len)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_device_name_set_req_enc(p_write_perm,
            p_dev_name,
            len,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_device_name_set_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_appearance_set(adapter_t *adapter, uint16_t appearance)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_appearance_set_req_enc(
            appearance,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_appearance_set_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}


uint32_t sd_ble_gap_ppcp_set(adapter_t *adapter, ble_gap_conn_params_t const * const p_conn_params)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_ppcp_set_req_enc(
            p_conn_params,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_ppcp_set_rsp_dec(buffer, length, result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}


uint32_t sd_ble_gap_adv_data_set(adapter_t *adapter, uint8_t const * const p_data,
    uint8_t               dlen,
    uint8_t const * const p_sr_data,
    uint8_t               srdlen)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_adv_data_set_req_enc(p_data,
            dlen,
            p_sr_data,
            srdlen,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_adv_data_set_rsp_dec(buffer, length, result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}


uint32_t sd_ble_gap_conn_param_update(adapter_t *adapter, uint16_t conn_handle, ble_gap_conn_params_t const * const p_conn_params)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_conn_param_update_req_enc(
            conn_handle,
            p_conn_params,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_conn_param_update_rsp_dec(buffer, length, result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}


uint32_t sd_ble_gap_disconnect(adapter_t *adapter, uint16_t conn_handle, uint8_t hci_status_code)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_disconnect_req_enc(
            conn_handle,
            hci_status_code,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_disconnect_rsp_dec(buffer, length, result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_sec_info_reply(adapter_t *adapter, uint16_t conn_handle,
    ble_gap_enc_info_t  const * p_enc_info,
    ble_gap_irk_t       const * p_id_info,
    ble_gap_sign_info_t const * p_sign_info)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_sec_info_reply_req_enc(
            conn_handle,
            p_enc_info,
            p_id_info,
            p_sign_info,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_sec_info_reply_rsp_dec(buffer, length, result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}


uint32_t sd_ble_gap_ppcp_get(adapter_t *adapter, ble_gap_conn_params_t * const p_conn_params)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_ppcp_get_req_enc(
            p_conn_params,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_ppcp_get_rsp_dec(
            buffer,
            length,
            p_conn_params,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_address_get(adapter_t *adapter, ble_gap_addr_t * const p_addr)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_address_get_req_enc(
            p_addr,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_address_get_rsp_dec(
            buffer,
            length,
            (ble_gap_addr_t *)p_addr,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_address_set(adapter_t *adapter, uint8_t addr_cycle_mode, ble_gap_addr_t const * const p_addr)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_address_set_req_enc(
            addr_cycle_mode,
            p_addr,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_address_set_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_adv_stop(adapter_t *adapter)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_adv_stop_req_enc(
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_adv_stop_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}


uint32_t sd_ble_gap_auth_key_reply(adapter_t *adapter, uint16_t              conn_handle,
    uint8_t               key_type,
    uint8_t const * const key)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_auth_key_reply_req_enc(
            conn_handle,
            key_type,
            key,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_auth_key_reply_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_authenticate(adapter_t *adapter, uint16_t conn_handle, ble_gap_sec_params_t const * const p_sec_params)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_authenticate_req_enc(
            conn_handle,
            p_sec_params,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_authenticate_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_conn_sec_get(adapter_t *adapter, uint16_t conn_handle, ble_gap_conn_sec_t * const p_conn_sec)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_conn_sec_get_req_enc(
            conn_handle,
            p_conn_sec,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_conn_sec_get_rsp_dec(
            buffer,
            length,
            (ble_gap_conn_sec_t * *)p_conn_sec,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_rssi_start(adapter_t *adapter, uint16_t conn_handle, uint8_t threshold_dbm, uint8_t skip_count)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_rssi_start_req_enc(
            conn_handle,
            threshold_dbm,
            skip_count,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_rssi_start_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_rssi_stop(adapter_t *adapter, uint16_t conn_handle)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_rssi_stop_req_enc(
            conn_handle,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_rssi_stop_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_tx_power_set(adapter_t *adapter, int8_t tx_power)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_tx_power_set_req_enc(
            tx_power,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_tx_power_set_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_scan_stop(adapter_t *adapter)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_scan_stop_req_enc(
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_scan_stop_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_connect(adapter_t *adapter,
    ble_gap_addr_t const * const        p_addr,
    ble_gap_scan_params_t const * const p_scan_params,
    ble_gap_conn_params_t const * const p_conn_params)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_connect_req_enc(
            p_addr,
            p_scan_params,
            p_conn_params,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_connect_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}


uint32_t sd_ble_gap_connect_cancel(adapter_t *adapter)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_connect_cancel_req_enc(
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_connect_cancel_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}


uint32_t sd_ble_gap_scan_start(adapter_t *adapter, ble_gap_scan_params_t const * const p_scan_params)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_scan_start_req_enc(
            p_scan_params,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_scan_start_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}

uint32_t sd_ble_gap_encrypt(adapter_t *adapter,
    uint16_t conn_handle,
    ble_gap_master_id_t const * p_master_id,
    ble_gap_enc_info_t  const * p_enc_info)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_encrypt_req_enc(
            conn_handle,
            p_master_id,
            p_enc_info,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_encrypt_rsp_dec(
            buffer,
            length,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}


uint32_t sd_ble_gap_rssi_get(adapter_t *adapter, uint16_t  conn_handle,
    int8_t  * p_rssi)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_rssi_get_req_enc(
            conn_handle,
            p_rssi,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_rssi_get_rsp_dec(
            buffer,
            length,
            (int8_t *)p_rssi,
            result);
    };

    return encode_decode(adapter, encode_function, decode_function);
}


uint32_t sd_ble_gap_sec_params_reply(adapter_t *adapter,
                                     uint16_t conn_handle,
                                     uint8_t sec_status,
                                     ble_gap_sec_params_t const *p_sec_params,
                                     ble_gap_sec_keyset_t const *p_sec_keyset)
{
    encode_function_t encode_function = [&](uint8_t *buffer, uint32_t *length) -> uint32_t {
        return ble_gap_sec_params_reply_req_enc(
            conn_handle,
            sec_status,
            p_sec_params,
            p_sec_keyset,
            buffer,
            length);
    };

    decode_function_t decode_function = [&](uint8_t *buffer, uint32_t length, uint32_t *result) -> uint32_t {
        return ble_gap_sec_params_reply_rsp_dec(
            buffer,
            length,
            p_sec_keyset,
            result);
    };

    uint32_t err_code = NRF_SUCCESS;
    uint32_t sec_tab_index = 0;

    // First allocate security context for serialization
    if (p_sec_keyset)
    {
        err_code = app_ble_gap_sec_context_create(conn_handle, &sec_tab_index);

        if (err_code != NRF_SUCCESS)
        {
            return err_code;
        }

        std::memcpy(&(m_app_keys_table[sec_tab_index].keyset), p_sec_keyset, sizeof(ble_gap_sec_keyset_t));
    }

    return encode_decode(adapter, encode_function, decode_function);
}
