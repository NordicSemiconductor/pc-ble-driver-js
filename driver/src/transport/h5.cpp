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

#include "h5.h"
#include "nrf_error.h"
#include <vector>
#include <algorithm>

// TODO: Provide proper constants in this file, too many magic values

uint8_t calculate_header_checksum(std::vector<uint8_t> &header)
{
    uint16_t checksum;

    checksum  = header[0];
    checksum += header[1];
    checksum += header[2];
    checksum &= 0xFFu;
    checksum  = (~checksum + 1u);

    return static_cast<uint8_t>(checksum);
}

uint16_t calculate_crc16_checksum(std::vector<uint8_t>::iterator start, std::vector<uint8_t>::iterator end)
{
    uint16_t crc = 0xffff;

    std::for_each(start, end, [&crc](uint8_t data) {
        crc = static_cast<uint8_t>(crc >> 8) | (crc << 8);
        crc ^= data;
        crc ^= static_cast<uint8_t>(crc & 0xff) >> 4;
        crc ^= (crc << 8) << 4;
        crc ^= ((crc & 0xff) << 4) << 1;
    });

    return crc;
}

void add_h5_header(std::vector<uint8_t> &out_packet,
                 uint8_t seq_num,
                 uint8_t ack_num,
                 bool crc_present,
                 bool reliable_packet,
                 uint8_t packet_type,
                 uint16_t payload_length)
{
    // TODO: Convert magic numbers to constants
    out_packet.push_back(
        (seq_num & 0x07)
        | ((ack_num << 3) & 0x38)
        | ((crc_present << 6) & 0x40)
        | ((reliable_packet << 7) & 0x80));

    out_packet.push_back(
        (packet_type & 0x0F)
        | ((payload_length << 4) & 0xF0));

    out_packet.push_back((payload_length >> 4) & 0xFF);
    out_packet.push_back(calculate_header_checksum(out_packet));
}

void add_crc16(std::vector<uint8_t> &out_packet)
{
    uint16_t crc16 = calculate_crc16_checksum(out_packet.begin(), out_packet.end());
    out_packet.push_back(crc16 & 0xFF);
    out_packet.push_back((crc16 >> 8) & 0xFF);
}

void h5_encode(std::vector<uint8_t> &in_packet,
               std::vector<uint8_t> &out_packet,
                   uint8_t seq_num,
                   uint8_t ack_num,
                   bool crc_present,
                   bool reliable_packet,
                   h5_pkt_type_t packet_type)
{
    add_h5_header(
        out_packet,
        seq_num,
        ack_num,
        crc_present,
        reliable_packet,
        packet_type,
        static_cast<uint16_t>(in_packet.size()));

    out_packet.insert(out_packet.end(), in_packet.begin(), in_packet.end());

    // Add CRC
    if (crc_present)
    {
        add_crc16(out_packet);
    }
}

uint32_t h5_decode(std::vector<uint8_t> &slipPayload,
                   std::vector<uint8_t> &h5Payload,
                   uint8_t *seq_num,
                   uint8_t *ack_num,
                   bool *reliable_packet,
                   h5_pkt_type_t *packet_type)
{
    uint16_t payload_length;

    if (slipPayload.size() < 4)
    {
        return NRF_ERROR_INVALID_LENGTH;
    }

    *seq_num = slipPayload[0] & 0x07;
    *ack_num = (slipPayload[0] >> 3) & 0x07;
    auto crc_present = static_cast<bool>((slipPayload[0] & 0x40) != 0);
    *reliable_packet = static_cast<bool>((slipPayload[0] & 0x80) != 0);
    *packet_type = static_cast<h5_pkt_type_t>(slipPayload[1] & 0x0F);
    payload_length = ((slipPayload[1] & 0xF0) >> 4) + (slipPayload[2] << 4);
    auto header_checksum = slipPayload[3];

    // Check if received packet size matches the packet size stated in header
    auto calculatedPayloadSize = payload_length + H5_HEADER_LENGTH + (crc_present ? 2 : 0);

    if (slipPayload.size() != calculatedPayloadSize)
    {
        return NRF_ERROR_INVALID_DATA;
    }

    auto calculated_header_checksum = calculate_header_checksum(slipPayload);

    if (header_checksum != calculated_header_checksum)
    {
        return NRF_ERROR_INVALID_DATA;
    }

    if (crc_present)
    {
        uint16_t packet_checksum = slipPayload[payload_length + H5_HEADER_LENGTH] + (slipPayload[payload_length + H5_HEADER_LENGTH + 1] << 8);
        auto calculated_packet_checksum = calculate_crc16_checksum(slipPayload.begin(), slipPayload.begin() + payload_length + H5_HEADER_LENGTH);

        if (packet_checksum != calculated_packet_checksum)
        {
            return NRF_ERROR_INVALID_DATA;
        }
    }

    if (payload_length > 0)
    {
        auto payloadIterator = slipPayload.begin() + 4;
        h5Payload.insert(h5Payload.begin(), payloadIterator, payloadIterator + payload_length);
    }

    return NRF_SUCCESS;
}
