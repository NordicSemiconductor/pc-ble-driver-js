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

const _ = require('underscore');
const EventEmitter = require('events');
const fs = require('fs');
const JSZip = require('jszip');

const BleTransport = require('./dfu/bleTransport');
const createError = require('./dfu/dfuConstants').createError;
const ErrorCode = require('./dfu/dfuConstants').ErrorCode;
const DfuSpeedometer = require('./dfu/dfuSpeedometer');
const logLevel = require('./util/logLevel');

/** @constant Enumeration of the Dfu controllers's possible states. */
const DfuState = Object.freeze({
    READY: 0,
    IN_PROGRESS: 1,
    ABORTING: 2,
});

/**
 * Class that provides Dfu controller functionality.
 *
 * @fires Adapter#stateChanged
 * @fires Dfu#transferStart
 * @fires Dfu#transferComplete
 * @fires Dfu#progressUpdate
 * @fires Adapter#logMessage
 */
class Dfu extends EventEmitter {
    /**
     * Initializes the Dfu controller.
     *
     * @constructor
     * @param {string} transportType TODO: is this used anywhere?
     * @param {Object} transportParameters Configuration parameters.
     * Available transport parameters:
     *  <ul>
     *  <li>{Object} adapter: An instance of adapter.
     *  <li>{string} targetAddress: The target address to connect to.
     *  <li>{string} targetAddressType: The target address type.
     *  <li>{number} [prnValue]: Packet receipt notification number.
     *  <li>{number} [mtuSize]: Maximum transmission unit number.
     *  </ul>
     */
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
        this._setState(DfuState.READY);
    }

    /**
     * Perform DFU with the given zip file. Successful when callback is invoked with no arguments.
     *
     * @param {string} zipFilePath Path to zip file containing data for Dfu.
     * @param {function} callback Signature: (err, abort) => {}.
     * @returns {void}
     */
    performDFU(zipFilePath, callback) {
        if (this._state !== DfuState.READY) {
            throw new Error('Not in READY state. DFU in progress or aborting.');
        }
        if (!zipFilePath) {
            throw new Error('No zipFilePath provided.');
        }
        if (!callback) {
            throw new Error('No callback function provided.');
        }

        this._log(logLevel.INFO, `Performing DFU with file: ${zipFilePath}`);
        this._setState(DfuState.IN_PROGRESS);

        this._fetchUpdates(zipFilePath)
            .then(updates => this._performUpdates(updates))
            .then(() => {
                this._log(logLevel.INFO, 'DFU completed successfully.');
                this._setState(DfuState.READY);
                callback();
            })
            .catch(err => {
                if (err.code === ErrorCode.ABORTED) {
                    this._log(logLevel.INFO, 'DFU aborted.');
                    callback(null, true);
                } else {
                    this._log(logLevel.ERROR, `DFU failed with error: ${err.message}.`);
                    callback(err);
                }
                this._setState(DfuState.READY);
            });
    }

    /**
     * Abort the Dfu procedure.
     *
     * @returns {void}
     */
    abort() {
        this._log(logLevel.INFO, 'Aborting DFU.');
        this._setState(DfuState.ABORTING);
        if (this._transport) {
            this._transport.abort();
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
            return prevPromise.then(() => this._performSingleUpdate(update.datFile, update.binFile));
        }, Promise.resolve());
    }

    _performSingleUpdate(datFile, binFile) {
        return this._createBleTransport()
            .then(() => this._checkAbortState())
            .then(() => this._transferInitPacket(datFile))
            .then(() => this._transferFirmware(binFile))
            .then(() => this._transport.waitForDisconnection())
            .then(() => this._destroyBleTransport())
            .catch(err => {
                this._destroyBleTransport();
                throw err;
            });
    }

    _checkAbortState() {
        if (this._state === DfuState.ABORTING) {
            return Promise.reject(createError(ErrorCode.ABORTED, 'Abort was triggered.'));
        }
        return Promise.resolve();
    }

    _createBleTransport() {
        return Promise.resolve()
            .then(() => {
                this._log(logLevel.DEBUG, 'Creating DFU transport.');
                this._transport = new BleTransport(this._transportParameters);
                this._setupTransportListeners();
                return this._transport.init();
            });
    }

    _destroyBleTransport() {
        if (this._transport) {
            this._log(logLevel.DEBUG, 'Destroying DFU transport.');
            this._removeTransportListeners();
            this._transport.destroy();
            this._transport = null;
        } else {
            this._log(logLevel.DEBUG, 'No DFU transport exists, so nothing to clean up.');
        }
    }

    _setupTransportListeners() {
        const progressInterval = 1000;
        const onProgressUpdate = _.throttle(progressUpdate => {
            this._handleProgressUpdate(progressUpdate);
        }, progressInterval);

        const onLogMessage = (level, message) => {
            this._log(level, message);
        };

        this._transport.on('progressUpdate', onProgressUpdate);
        this._transport.on('logMessage', onLogMessage);
    }

    _removeTransportListeners() {
        this._transport.removeAllListeners('progressUpdate');
        this._transport.removeAllListeners('logMessage');
    }

    _transferInitPacket(file) {
        /**
         * DFU transfer start event.
         *
         * @event Dfu#transferStart
         * @type {Object}
         * @property {string} file.name - The name of the file being transferred.
         */
        this.emit('transferStart', file.name);
        return file.loadData().then(data => {
            return this._transport.sendInitPacket(data)
                .then(() => this.emit('transferComplete', file.name));
        });
    }

    _transferFirmware(file) {
        this.emit('transferStart', file.name);
        return file.loadData().then(data => {
            return this._transport.getFirmwareState(data)
                .then(state => {
                    this._speedometer = new DfuSpeedometer(data.length, state.offset);
                    return this._transport.sendFirmware(data);
                })

                /**
                 * DFU transfer complete event.
                 *
                 * @event Dfu#transferComplete
                 * @type {Object}
                 * @property {string} file.name - The name of the file that was transferred.
                 */
                .then(() => this.emit('transferComplete', file.name));
        });
    }

    _handleProgressUpdate(progressUpdate) {
        if (progressUpdate.offset) {
            this._speedometer.updateState(progressUpdate.offset);

            /**
             * DFU progress update event.
             *
             * @event Dfu#progressUpdate
             * @type {Object}
             * @property {Object} _ - Progress meta-data.
             */
            this.emit('progressUpdate', {
                stage: progressUpdate.stage,
                completedBytes: progressUpdate.offset,
                totalBytes: this._speedometer.totalBytes,
                bytesPerSecond: this._speedometer.calculateBytesPerSecond(),
                averageBytesPerSecond: this._speedometer.calculateAverageBytesPerSecond(),
                percentCompleted: this._speedometer.calculatePercentCompleted(),
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
    * @param {string} zipFilePath Path of the zip file.
    * @returns {Promise} For manifest.json
    * @private
    */
    _getManifestAsync(zipFilePath) {
        return new Promise((resolve, reject) => {
            this.getManifest(zipFilePath, (err, manifest) => {
                err ? reject(err) : resolve(manifest);
            });
        });
    }

    /**
     * Get promise for JSZip zip object of the given zip file.
     * This function is a wrapper for _loadZip().
     *
     * @param {string} zipFilePath path of the zip file
     * @returns {Promise} for JSZip zip object
     * @private
     */
    _loadZipAsync(zipFilePath) {
        return new Promise((resolve, reject) => {
            this._loadZip(zipFilePath, (err, zip) => {
                err ? reject(err) : resolve(zip);
            });
        });
    }

    /**
     * Fetch datFile and binFile for all updates included in the zip.
     * Returns a sorted array of updates, on the format:
     * [{
     *   datFile: {
     *     name: filename.dat,
     *     loadData: <function returning promise with data>
     *   },
     *   binFile: {
     *     name: filename.bin,
     *     loadData: <function returning promise with data>
     *   }
     * }, ... ]
     *
     * The sorting is such that the application update is put last.
     *
     * @param {string} zipFilePath path of the zip file containing the updates
     * @returns {Promise} resolves to an array of updates
     * @returns {void}
     * @private
     */
    _fetchUpdates(zipFilePath) {
        this._log(logLevel.DEBUG, `Loading zip file: ${zipFilePath}`);
        return Promise.all([
            this._loadZipAsync(zipFilePath),
            this._getManifestAsync(zipFilePath),
        ]).then(result => {
            const zip = result[0];
            const manifest = result[1];
            return this._getFirmwareTypes(manifest).map(type => {
                const firmwareUpdate = manifest[type];
                const datFileName = firmwareUpdate.dat_file;
                const binFileName = firmwareUpdate.bin_file;
                this._log(logLevel.DEBUG, `Found ${type} files: ${datFileName}, ${binFileName}`);
                return {
                    datFile: {
                        name: datFileName,
                        loadData: () => zip.file(datFileName).async('array'),
                    },
                    binFile: {
                        name: binFileName,
                        loadData: () => zip.file(binFileName).async('array'),
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
            'application',
        ].filter(type => !!manifest[type]);
    }

    /**
     * Get JSZip zip object of the given zip file.
     *
     * @param {string} zipFilePath Path of the zip file.
     * @param {function} callback Signature: (err, zip) => {}.
     * @returns {void}
     * @private
     */
    _loadZip(zipFilePath, callback) {
        fs.readFile(zipFilePath, (err, data) => {
            if (err) {
                return callback(err);
            }

            // Get and return zip object
            JSZip.loadAsync(data)
                .then(zip => {
                    callback(undefined, zip);
                })
                .catch(error => {
                    callback(error);
                });
        });
    }

    /**
     * Get and return manifest object from the given zip file.
     *
     * The manifest object has one or more of the following properties:
     * {
     *   application: {},
     *   bootloader: {},
     *   softdevice: {},
     *   softdevice_bootloader: {},
     * }
     *
     * Each of the above properties have the following:
     * {
     *   bin_file: <string>, // Firmware filename
     *   dat_file: <string>, // Init packet filename
     * }
     *
     * The softdevice_bootloader property also has:
     * info_read_only_metadata: {
     *   bl_size: <integer>, // Bootloader size
     *   sd_size: <integer>, // Softdevice size
     * }
     *
     * @param {string} zipFilePath Path to the zip file.
     * @param {function} callback Signature: (err, manifest) => {}.
     * @returns {void}
     */
    getManifest(zipFilePath, callback) {
        if (!zipFilePath) {
            throw new Error('No zipFilePath provided.');
        }

        // Fetch zip object
        this._loadZip(zipFilePath, (err, zip) => {
            if (err) {
                return callback(err);
            }
            // Read out manifest from zip
            zip.file('manifest.json')
                .async('string')
                .then(data => {
                    let manifest;
                    try {
                        // Parse manifest as JSON
                        manifest = JSON.parse(data).manifest;
                    } catch (error) {
                        return callback(error);
                    }
                    // Return manifest
                    return callback(undefined, manifest);
                });
        });
    }

    _log(level, message) {
        this.emit('logMessage', level, message);
    }
}

module.exports = Dfu;
