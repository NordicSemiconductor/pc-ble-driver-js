/*
 * Copyright (c) 2016 Nordic Semiconductor ASA
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form must reproduce the above copyright notice, this
 *   list of conditions and the following disclaimer in the documentation and/or
 *   other materials provided with the distribution.
 *
 *   3. Neither the name of Nordic Semiconductor ASA nor the names of other
 *   contributors to this software may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 *   4. This software must only be used in or with a processor manufactured by Nordic
 *   Semiconductor ASA, or in or with a processor manufactured by a third party that
 *   is used in combination with a processor manufactured by Nordic Semiconductor.
 *
 *   5. Any software provided in binary or object form under this license must not be
 *   reverse engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const _ = require('underscore');
const JSZip = require('jszip');
const fs = require('fs');
const EventEmitter = require('events');

const { ErrorCode } = require('./dfu/dfuConstants');
const DfuTransportFactory = require('./dfu/dfuTransportFactory');
const DfuSpeedometer = require('./dfu/dfuSpeedometer');

const DfuState = Object.freeze({
    READY: 0,
    IN_PROGRESS: 1,
    ABORTING: 2,
});

/**
 * Class that provides Dfu controller functionality
 * @class
 */
class Dfu extends EventEmitter {

    constructor(transportType, transportParameters) {
        super();

        if (!transportType) {
            throw new Error('No transport type provided.');
        }
        if (!transportParameters) {
            throw new Error('No transport parameters provided.');
        }

        this._transportType = transportType;
        this._transportParameters = transportParameters;
        this._transport = null;
        this._speedometer = null;
        this._handleProgressUpdate = _.throttle(this._handleProgressUpdate.bind(this), 1000);

        this._setState(DfuState.READY);
    }

    // Run the entire DFU process
    performDFU(zipFilePath, callback) {
        if (this._state !== DfuState.READY) {
            throw new Error('Not in READY state. DFU in progress or aborting.');
        }
        if (!zipFilePath) {
            throw new Error('No zipFilePath provided.');
        }

        this._setState(DfuState.IN_PROGRESS);

        this._fetchUpdates(zipFilePath)
            .then(updates => this._performUpdates(updates))
            .then(() => this._setState(DfuState.READY))
            .then(() => callback && callback())
            .catch(err => {
                if (err.code === ErrorCode.ABORTED) {
                    this._setState(DfuState.READY);
                    const aborted = true;
                    if (callback) { callback(null, aborted); }
                } else {
                    if (callback) { callback(err); }
                }
            });
    }

    abort() {
        this._setState(DfuState.ABORTING);
        if (this._transport) {
            this._transport.abort();
        } else {
            // TODO Should stop either way. Not throw error. Aborting should not rely on having a transport.
            throw new Error('Abort called, but no transport is in progress.');
        }
    }

    _setState(state) {
        if (this._state !== state) {
            this._state = state;
            this.emit('stateChanged', state);
        }
    }

    _performUpdates(updates) {
        return updates.reduce((prevPromise, update) => {
            return prevPromise.then(() => this._performSingleUpdate(update.initPacket, update.firmware));
        }, Promise.resolve());
    }

    _performSingleUpdate(initPacket, firmware) {
        return this._initializeDfuTransport()
            .then(() => this._transferInitPacket(initPacket))
            .then(() => this._transferFirmware(firmware))
            .then(() => this._transport.waitForDisconnection())
            .then(() => this._closeDfuTransport())
            .catch(err => {
                this._closeDfuTransport();
                throw err;
            });
    }

    _initializeDfuTransport() {
        return DfuTransportFactory.create(this._transportParameters)
            .then(transport => {
                this._transport = transport;
                this._transport.on('progressUpdate', this._handleProgressUpdate);
            });
    }

    _closeDfuTransport() {
        return Promise.resolve()
            .then(() => this._transport.removeListener('progressUpdate', this._handleProgressUpdate))
            .then(() => this._transport.destroy())
            .then(() => this._transport = null );
    }

    _transferInitPacket(initPacket) {
        this.emit('transferStart', initPacket.name);
        return initPacket.loadData()
            .then(data => this._transport.sendInitPacket(data))
            .then(() => this.emit('transferComplete', initPacket.name));
    }

    _transferFirmware(firmware) {
        this.emit('transferStart', firmware.name);
        return firmware.loadData().then(data => {
            return this._transport.getFirmwareState(data)
                .then(state => {
                    this._speedometer = new DfuSpeedometer(data.length, state.offset);
                    return this._transport.sendFirmware(data);
                })
                .then(() => this.emit('transferComplete', firmware.name));
        });
    }

    _handleProgressUpdate(progressUpdate) {
        if (progressUpdate.offset) {
            this._speedometer.setCompletedBytes(progressUpdate.offset);
            this.emit('progressUpdate', {
                stage: progressUpdate.stage,
                offset: progressUpdate.offset,
                percentCompleted: this._speedometer.getPercentCompleted(),
                bytesPerSecond: this._speedometer.getBytesPerSecond(),
                averageBytesPerSecond: this._speedometer.getAverageBytesPerSecond(),
                completedBytes: this._speedometer.getCompletedBytes(),
                totalBytes: this._speedometer.getTotalBytes(),
            });
        } else {
            this.emit('progressUpdate', {
                stage: progressUpdate.stage,
            });
        }
    }

   /**
    * Get promise for manifest.json from the given zip file.
    * This function is a wrapper for getManifest().
    *
    * @param zipFilePath path of the zip file
    * @returns Promise for manifest.json
    * @private
    */
    _getManifestAsync(zipFilePath) {
        return new Promise((resolve, reject) => {
            this.getManifest(zipFilePath, (err, manifest) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(manifest);
                }
            });
        });
    }

    /**
     * Get promise for JSZip zip object of the given zip file.
     * This function is a wrapper for _loadZip().
     *
     * @param zipFilePath path of the zip file
     * @returns Promise for JSZip zip object
     * @private
     */
    _loadZipAsync(zipFilePath) {
        return new Promise ((resolve, reject) => {
            this._loadZip(zipFilePath, (err, zip) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(zip);
                }
            });
        });
    }

    /**
     * Fetch init packet (dat_file) and firmware (bin_file) for all updates
     * included in the zip. Returns a sorted array of updates, on the format:
     * [{
     *   initPacket: {
     *     name: filename.dat,
     *     loadData: <function returning promise with data>
     *   },
     *   firmware: {
     *     name: filename.bin,
     *     loadData: <function returning promise with data>
     *   }
     * }, ... ]
     *
     * The sorting is such that the application update is put last.
     * Each promise resolves with the contents of the given file.
     *
     * @param zipFilePath path of the zip file containing the updates
     * @returns Promise resolves to an array of updates
     * @private
     */
    _fetchUpdates(zipFilePath) {
        return Promise.all([
            this._loadZipAsync(zipFilePath),
            this._getManifestAsync(zipFilePath)
        ]).then(([zip, manifest]) => {
            return this._getFirmwareTypes(manifest).map(type => {
                const firmwareUpdate = manifest[type];
                const initPacketName = firmwareUpdate['dat_file'];
                const firmwareName = firmwareUpdate['bin_file'];
                return {
                    initPacket: {
                        name: initPacketName,
                        loadData: () => zip.file(initPacketName).async('array'),
                    },
                    firmware: {
                        name: firmwareName,
                        loadData: () => zip.file(firmwareName).async('array'),
                    },
                };
            });
        });
    }

    _getFirmwareTypes(manifest) {
        return [
            'softdevice',
            'bootloader',
            'softdevice_bootloader',
            'application'
        ].filter(type => manifest[type] ? true : false);
    }

    /**
     * Get JSZip zip object of the given zip file.
     *
     * @param zipFilePath path of the zip file
     * @param callback signature: (err, zip) => {}
     * @private
     */
    _loadZip(zipFilePath, callback) {
        // Read zip file
        fs.readFile(zipFilePath, (err, data) => {
            if (err) {
                return callback(err);
            }

            // Get and return zip object
            JSZip.loadAsync(data)
            .then((zip) => {
                callback(undefined, zip);
            })
            .catch((err) => {
                return callback(err);
            })
        })
    }

    /**
     * Get and return manifest.json from the given zip file.
     *
     * @param zipFilePath path of the zip file
     * @param callback signature: (err, manifest) => {}
     */
    getManifest(zipFilePath, callback) {
        if (zipFilePath === undefined) { throw new Error('Missing argument zipFilePath.'); }
        if ((typeof zipFilePath !== "string") || (!zipFilePath.length)) {
            throw new Error('zipFilePath must be a non-empty string.');
        }

        // Fetch zip object
        this._loadZip(zipFilePath, (err, zip) => {
            if (err) {
                return callback(err);
            }
            // Read out manifest from zip
            zip.file("manifest.json")
            .async("string")
            .then((data) => {
                let manifest;
                try {
                    // Parse manifest as JASON
                    manifest = JSON.parse(data)['manifest'];
                } catch (err) {
                    return callback(err);
                }
                // Return manifest
                return callback(undefined, manifest);
            }, (err) => {
                return callback(err);
            });
        })
    }

    /* Manifest object format:
    Consists of one or more properties whose name is one of:
        application
        bootloader
        softdevice
        softdevice_bootloader
    Each of the above properties is a firmware object, on the format:
        {bin_file: <binfile>,   // Name of file containing firmware.
         dat_file: <datfile>}   // Name of file containing init packet.
    A firmware object named softdevice_bootloader has one additional property:
        info_read_only_metadata: {
            bl_size: <blsize>,    // Size of bootloader.
            sd_size: <sdsize>}    // Size of softdevice.
    */
}

module.exports = Dfu;
