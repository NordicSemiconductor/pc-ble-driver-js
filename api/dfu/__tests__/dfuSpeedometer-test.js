'use strict';

const DfuSpeedometer = require('../dfuSpeedometer');

describe('when initialized with total bytes 102400, and completed bytes 0', () => {

    const totalBytes = 102400;
    let speedometer;

    beforeEach(() => {
        speedometer = new DfuSpeedometer(totalBytes);
    });

    it('should have start time', () => {
        expect(speedometer.getStartTime()).toBeDefined();
    });

    it('should have total size', () => {
        expect(speedometer.getTotalBytes()).toBe(totalBytes);
    });

    it('should have zero completed size', () => {
        expect(speedometer.getCompletedBytes()).toBe(0);
    });

    it('should have zero perecent completed', () => {
        expect(speedometer.getPercentCompleted()).toBe(0);
    });

    describe('when completed bytes has been set to 10000', () => {

        beforeEach(() => {
            speedometer.setCompletedBytes(10000);
        });

        it('should have updated completed bytes to 10000', () => {
            expect(speedometer.getCompletedBytes()).toBe(10000);
        });

        it('should return a bytesPerSecond value larger than zero', () => {
            expect(speedometer.getBytesPerSecond()).toBeGreaterThan(0);
        });

        it('should return percentCompleted value 9', () => {
            expect(speedometer.getPercentCompleted()).toBe(9);
        });
    });
});

describe('when initialized with total bytes 102400, completed bytes 0, and percent range 10-20', () => {

    const totalBytes = 102400;
    const completedBytes = 0;
    const percentRange = { min: 10, max: 20 };
    let speedometer;

    beforeEach(() => {
        speedometer = new DfuSpeedometer(totalBytes, completedBytes, percentRange);
    });

    describe('when completed bytes has been set to 10000', () => {

        beforeEach(() => {
            speedometer.setCompletedBytes(50000);
        });

        it('should return percentCompleted value 14 with no decimals', () => {
            expect(speedometer.getPercentCompleted()).toBe(14);
        });
    });
});

describe('when calculating bytes per second', () => {

    const calculate = (numBytes, lastUpdatedTime, currentTime) => {
        return DfuSpeedometer.calculateBytesPerSecond(numBytes, lastUpdatedTime, currentTime);
    };

    it('should return zero if byte count is negative', () => {
        const lastUpdatedTime = new Date();
        const currentTime = new Date();
        const byteCount = -1;

        expect(calculate(byteCount, lastUpdatedTime, currentTime)).toEqual(0);
    });

    it('should return 20 if 10 bytes have been written in 500 milliseconds', () => {
        const lastUpdatedTime = new Date(2016, 10, 1, 10, 0, 0, 0);
        const currentTime = new Date(2016, 10, 1, 10, 0, 0, 500);
        const byteCount = 10;

        expect(calculate(byteCount, lastUpdatedTime, currentTime)).toEqual(20);
    });

    it('should return 20.08 (round to two decimals) if 10 bytes have been written in 498 milliseconds', () => {
        const lastUpdatedTime = new Date(2016, 10, 1, 10, 0, 0, 0);
        const currentTime = new Date(2016, 10, 1, 10, 0, 0, 498);
        const byteCount = 10;

        expect(calculate(byteCount, lastUpdatedTime, currentTime)).toEqual(20.08);
    });
});
