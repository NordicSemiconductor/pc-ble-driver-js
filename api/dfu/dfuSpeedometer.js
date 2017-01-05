'use strict';

class DfuSpeedometer {

    constructor(totalBytes, completedBytes, percentRange) {
        this._startTime = new Date();
        this._lastUpdatedTime = this._startTime;
        this._totalBytes = totalBytes;
        this._completedBytes = completedBytes || 0;
        this._initialBytes = completedBytes || 0;
        this._percentRange = percentRange || { min: 0, max: 100 };
        this._bytesPerSecond = 0;
    }

    getStartTime() {
        return this._startTime;
    }

    getTotalBytes() {
        return this._totalBytes;
    }

    getCompletedBytes() {
        return this._completedBytes;
    }

    getBytesPerSecond() {
        return this._bytesPerSecond;
    }

    getPercentCompleted() {
        const range = this._percentRange;
        const percent = range.min + (this._completedBytes / this._totalBytes * (range.max - range.min));
        return Math.floor(percent);
    }

    getAverageBytesPerSecond() {
        const byteDifference = this._completedBytes - this._initialBytes;
        const currentTime = new Date();
        return DfuSpeedometer.calculateBytesPerSecond(byteDifference, this._startTime, currentTime);
    }

    setCompletedBytes(completedBytes) {
        const byteDifference = completedBytes - this._completedBytes;
        const currentTime = new Date();
        this._bytesPerSecond = DfuSpeedometer.calculateBytesPerSecond(byteDifference, this._lastUpdatedTime, currentTime);
        this._lastUpdatedTime = currentTime;
        this._completedBytes = completedBytes;
    }

    static calculateBytesPerSecond(numBytes, lastUpdatedTime, currentTime) {
        if (numBytes < 0) {
            return 0;
        }
        const msSinceLastCalled = currentTime.getTime() - lastUpdatedTime.getTime();
        const bytesPerSecond = numBytes / msSinceLastCalled * 1000;
        return +bytesPerSecond.toFixed(2);
    }
}

module.exports = DfuSpeedometer;