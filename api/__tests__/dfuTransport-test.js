import DfuTransport from '../dfuTransport';

describe('constructor', () => {

    const adapter = {
        startCharacteristicsNotifications: jest.fn()
    };
    new DfuTransport(adapter);

    it('should start notifications for the given control point characteristic id', () => {
        expect(adapter.startCharacteristicsNotifications).toHaveBeenCalled();
    });
});

describe('_createChunks', () => {

    const createChunks = (data, chunkSize) => DfuTransport._createChunks(data, chunkSize);

    describe('when array is empty', () => {
        const data = [];
        const chunkSize = 1;

        it('should return empty array', () => {
            expect(createChunks(data, chunkSize)).toEqual([]);
        });
    });

    describe('when chunk size is 0', () => {
        const data = [];
        const chunkSize = 0;

        it('should throw error', () => {
            expect(() => createChunks(data, chunkSize)).toThrow();
        });
    });

    describe('when array has 1 item and chunk size is 2', () => {
        const data = [1];
        const chunkSize = 2;

        it('should return 1 chunk', () => {
            expect(createChunks(data, chunkSize)).toEqual([[1]]);
        });
    });

    describe('when array has 1 item and chunk size is 1', () => {
        const data = [1];
        const chunkSize = 1;

        it('should return 1 chunk with 1 item', () => {
            expect(createChunks(data, chunkSize)).toEqual([[1]]);
        });
    });

    describe('when array has 2 items and chunk size is 1', () => {
        const data = [1, 2];
        const chunkSize = 1;

        it('should return 2 chunks with 1 item each', () => {
            expect(createChunks(data, chunkSize)).toEqual([[1], [2]]);
        });
    });

    describe('when array has 7 items and chunk size is 3', () => {
        const data = [1, 2, 3, 4, 5, 6, 7];
        const chunkSize = 3;

        it('should return 3 chunks with max 3 items', () => {
            expect(createChunks(data, chunkSize)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
        });
    });
});


describe('_readControlPointResponse', () => {

    const RESPONSE_CODE = 0x60;
    const createDfuTransport = notifications => {
        const adapter = {
            startCharacteristicsNotifications: jest.fn()
        };
        const dfuTransport = new DfuTransport(adapter);
        dfuTransport._notifications = notifications;
        dfuTransport.setPollInterval(10);
        dfuTransport.setTimeout(50);
        return dfuTransport;
    };

    describe('when empty list of notifications', () => {

        const dfuTransport = createDfuTransport([]);

        it('should time out', () => {
            return dfuTransport._readControlPointResponse().catch(error => {
                expect(error).toContain('Timed out');
            });
        });

    });

    describe('when notification has matching opcode, but is not a response', () => {

        const notification = [0x01, 0x02];
        const dfuTransport = createDfuTransport([notification]);

        it('should time out', () => {
            return dfuTransport._readControlPointResponse(0x02).catch(error => {
                expect(error).toContain('Timed out');
            });
        });

    });

    describe('when notification is response, but does not have matching opcode', () => {

        const notification = [RESPONSE_CODE, 0x01];
        const dfuTransport = createDfuTransport([notification]);

        it('should time out', () => {
            return dfuTransport._readControlPointResponse(0x02).catch(error => {
                expect(error).toContain('Timed out');
            });
        });

    });

    describe('when notification is response, and has matching opcode', () => {

        const notification = [RESPONSE_CODE, 0x01];
        const dfuTransport = createDfuTransport([notification]);

        it('should return notification', () => {
            return dfuTransport._readControlPointResponse(0x01).then(notification => {
                expect(notification).toBe(notification);
            });
        });

    });

    describe('when two notifications, but only the last has matching opcode', () => {

        const notification1 = [RESPONSE_CODE, 0x02];
        const notification2 = [RESPONSE_CODE, 0x01];
        const dfuTransport = createDfuTransport([notification1, notification2]);

        it('should return last notification', () => {
            return dfuTransport._readControlPointResponse(0x01).then(notification => {
                expect(notification).toBe(notification2);
            });
        });

    });

    describe('when empty notifications initially, but notification is added before timeout', () => {

        const notification = [RESPONSE_CODE, 0x01];
        const dfuTransport = createDfuTransport([]);
        setTimeout(() => dfuTransport._notifications.push(notification), 20);

        it('should return notification', () => {
            return dfuTransport._readControlPointResponse(0x01).then(notification => {
                expect(notification).toBe(notification);
            });
        });

    });

    describe('when empty notifications initially, but notification is added after timeout', () => {

        const notification = [RESPONSE_CODE, 0x01];
        const dfuTransport = createDfuTransport([]);
        setTimeout(() => dfuTransport._notifications.push(notification), 20);

        it('should time out', () => {
            return dfuTransport._readControlPointResponse(0x02).catch(error => {
                expect(error).toContain('Timed out');
            });
        });

    });
});

