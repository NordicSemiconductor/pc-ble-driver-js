'use strict';

const DfuSpeedometer = require('../dfuSpeedometer');

describe('when initialized with total bytes 0 and completed bytes 0', () => {
    const totalBytes = 0;
    const completedBytes = 0;
    const speedometer = new DfuSpeedometer(totalBytes, completedBytes);

    it('should have been automatically given a start time', () => {
        expect(speedometer.startTime).toBeDefined();
    });

    it('should have the given total bytes', () => {
        expect(speedometer.totalBytes).toBe(totalBytes);
    });

    it('should have 0 bytes per second', () => {
        expect(speedometer.calculateBytesPerSecond()).toBe(0);
    });

    it('should have 0 average bytes per second', () => {
        expect(speedometer.calculateAverageBytesPerSecond()).toBe(0);
    });

    it('should be 0% completed', () => {
        expect(speedometer.calculatePercentCompleted()).toBe(0);
    });
});

describe('when initialized with total bytes 100 and completed bytes 100', () => {
    const totalBytes = 100;
    const completedBytes = 100;
    const speedometer = new DfuSpeedometer(totalBytes, completedBytes);

    it('should have 0 bytes per second', () => {
        expect(speedometer.calculateBytesPerSecond()).toBe(0);
    });

    it('should have 0 average bytes per second', () => {
        expect(speedometer.calculateAverageBytesPerSecond()).toBe(0);
    });

    it('should be 100% completed', () => {
        expect(speedometer.calculatePercentCompleted()).toBe(100);
    });
});

describe('when initialized with total bytes 102400 and completed bytes 0', () => {
    const totalBytes = 102400;
    const completedBytes = 0;
    const speedometer = new DfuSpeedometer(totalBytes, completedBytes);

    it('should have the given total bytes', () => {
        expect(speedometer.totalBytes).toBe(totalBytes);
    });

    it('should have 0 bytes per second', () => {
        expect(speedometer.calculateBytesPerSecond()).toBe(0);
    });

    it('should have 0 average bytes per second', () => {
        expect(speedometer.calculateAverageBytesPerSecond()).toBe(0);
    });

    it('should be 0% completed', () => {
        expect(speedometer.calculatePercentCompleted()).toBe(0);
    });

    describe('when setting completed bytes to 10000', () => {
        const completedBytes = 10000;
        beforeEach(() => {
            speedometer.updateState(completedBytes);
        });

        it('should have bytes per second larger than zero', () => {
            expect(speedometer.calculateBytesPerSecond()).toBeGreaterThan(0);
        });

        it('should have average bytes per second larger than zero', () => {
            expect(speedometer.calculateAverageBytesPerSecond()).toBeGreaterThan(0);
        });

        it('should be 9% completed', () => {
            expect(speedometer.calculatePercentCompleted()).toBe(9);
        });
    });
});

describe('when initialized with total bytes 102400, completed bytes 1000, and start time', () => {
    const totalBytes = 102400;
    const completedBytes = 10000;
    const startTime = new Date(2016, 10, 1, 10, 0, 0, 0);
    let speedometer;

    beforeEach(() => {
        speedometer = new DfuSpeedometer(totalBytes, completedBytes, startTime);
    });

    it('should have the given start time', () => {
        expect(speedometer.startTime).toBe(startTime);
    });

    it('should have 0 bytes per second', () => {
        expect(speedometer.calculateBytesPerSecond()).toBe(0);
    });

    it('should have 0 average bytes per second', () => {
        expect(speedometer.calculateAverageBytesPerSecond()).toBe(0);
    });

    it('should be 9% completed', () => {
        expect(speedometer.calculatePercentCompleted()).toBe(9);
    });

    describe('when updating completed bytes to 12000 after 500 milliseconds', () => {
        const completedBytes = 12000;
        const time500Ms = new Date(startTime.getTime() + 500);

        beforeEach(() => {
            speedometer.updateState(completedBytes, time500Ms);
        });

        it('should have 4000 bytes per second', () => {
            expect(speedometer.calculateBytesPerSecond()).toBe(4000);
        });

        it('should have 4000 average bytes per second', () => {
            expect(speedometer.calculateAverageBytesPerSecond()).toBe(4000);
        });

        it('should be 11% completed', () => {
            expect(speedometer.calculatePercentCompleted()).toBe(11);
        });

        describe('when updating completed bytes to 13990 after 555 milliseconds', () => {
            const completedBytes = 13990;
            const time501Ms = new Date(time500Ms.getTime() + 555);

            beforeEach(() => {
                speedometer.updateState(completedBytes, time501Ms);
            });

            it('should have 3585.59 bytes per second', () => {
                expect(speedometer.calculateBytesPerSecond()).toBe(3585.59);
            });

            it('should have 3781.99 average bytes per second', () => {
                expect(speedometer.calculateAverageBytesPerSecond()).toBe(3781.99);
            });

            it('should be 13% completed', () => {
                expect(speedometer.calculatePercentCompleted()).toBe(13);
            });
        });
    });
});
