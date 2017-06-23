/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const ErrorCode = require('../../dfuConstants').ErrorCode;
const DeviceInfoService = require('../deviceInfoService');

describe('getCharacteristicId', () => {

    let service;
    let adapter;

    describe('when adapter throws error when getting attributes', () => {

        beforeEach(() => {
            adapter = {
                getAttributes: (id, callback) => callback(new Error())
            };
            service = new DeviceInfoService(adapter);
        });

        it('should return error', () => {
            return service.getCharacteristicId().catch(error => {
                expect(error.code).toEqual(ErrorCode.NO_DFU_SERVICE);
            });
        });
    });

    describe('when the device has a service with a characteristic', () => {

        beforeEach(() => {
            adapter = {
                getAttributes: (id, callback) => callback(null, {
                    services: {
                        'service-id-123': {
                            uuid: 'service-uuid-123',
                            characteristics: {
                                'characteristic-id-123': {
                                    uuid: 'characteristic-uuid-123'
                                }
                            }
                        }
                    }

                })
            };
            service = new DeviceInfoService(adapter);
        });

        describe('when asking for non-existing service uuid', () => {

            it('should return error', () => {
                const serviceUuid = 'non-existing-uuid';
                return service.getCharacteristicId(serviceUuid).catch(error => {
                    expect(error.code).toEqual(ErrorCode.NO_DFU_SERVICE);
                });
            });

        });

        describe('when asking for existing service uuid, but non-existing characteristic uuid', () => {

            it('should return error', () => {
                const serviceUuid = 'service-uuid-123';
                const characteristicUuid = 'non-existing-characteristic-uuid';
                return service.getCharacteristicId(serviceUuid, characteristicUuid).catch(error => {
                    expect(error.code).toEqual(ErrorCode.NO_DFU_CHARACTERISTIC);
                });
            });
        });

        describe('when asking for existing service uuid and characteristic uuid', () => {

            it('should return characteristic id', () => {
                const serviceUuid = 'service-uuid-123';
                const characteristicUuid = 'characteristic-uuid-123';
                return service.getCharacteristicId(serviceUuid, characteristicUuid).then(characteristicId => {
                    expect(characteristicId).toEqual('characteristic-id-123');
                });
            });
        });
    });
});
