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
