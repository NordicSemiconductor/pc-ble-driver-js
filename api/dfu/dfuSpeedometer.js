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

class DfuSpeedometer {

    /**
     * Create speedometer that keeps track of speed and progress of
     * DFU transfer.
     *
     * @param totalBytes total number of bytes to transfer
     * @param completedBytes number of bytes that have already been transferred
     * @param startTime Date instance representing the current time (optional)
     */
    constructor(totalBytes, completedBytes, startTime) {
        this._startTime = startTime || new Date();
        this._prevUpdatedTime = this._startTime;
        this._updatedTime = this._startTime;
        this._totalBytes = totalBytes;
        this._prevCompletedBytes = completedBytes || 0;
        this._completedBytes = completedBytes || 0;
        this._initialBytes = completedBytes || 0;
    }

    get startTime() {
        return this._startTime;
    }

    get totalBytes() {
        return this._totalBytes;
    }

    /**
     * Update the number of bytes that have been transferred and keep
     * the current time, so that we can calculate transfer speed.
     *
     * @param completedBytes number of bytes that have been transferred
     * @param currentTime Date instance representing the current time (optional)
     */
    updateState(completedBytes, currentTime) {
        this._prevUpdatedTime = this._updatedTime;
        this._updatedTime = currentTime || new Date();
        this._prevCompletedBytes = this._completedBytes;
        this._completedBytes = completedBytes;
    }

    calculateBytesPerSecond() {
        const byteDifference = this._completedBytes - this._prevCompletedBytes;
        return calculateBytesPerSecond(byteDifference, this._prevUpdatedTime, this._updatedTime);
    }

    calculateAverageBytesPerSecond() {
        const byteDifference = this._completedBytes - this._initialBytes;
        return calculateBytesPerSecond(byteDifference, this._startTime, this._updatedTime);
    }

    calculatePercentCompleted() {
        if (this._totalBytes > 0) {
            return Math.floor((this._completedBytes / this._totalBytes) * 100);
        }
        return 0;
    }
}

function calculateBytesPerSecond(numBytes, beginTime, endTime) {
    const msTimeDifference = endTime.getTime() - beginTime.getTime();
    if (numBytes < 0 || msTimeDifference <= 0) {
        return 0;
    }
    const bytesPerSecond = numBytes / msTimeDifference * 1000;
    return +bytesPerSecond.toFixed(2);
}

module.exports = DfuSpeedometer;
