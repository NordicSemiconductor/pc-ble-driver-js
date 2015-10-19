'use strict';

var AdType = require('../../../api/util/adType.js');
var assert = require('assert');

describe('AdType', function() {
    it('should convert a advertisement object to a byte array', function () {
        var advertisingDataA = {
            shortLocalName: 'A',
            completeLocalName: 'AB',
            flags: ['leGeneralDiscMode', 'brEdrNotSupported'],
            txPowerLevel: 0,
            '16bitServiceUuidMoreAvailable': ['DE-AD', 'BE-EF'],
            '16bitServiceUuidComplete': ['BE-EF', 'DE-AD'],
            raw: []
        };

        var buffer = AdType.convertToBuffer(advertisingDataA);
        assert.ok(buffer);
        assert.ok(Buffer.compare(
            buffer,
            new Buffer([3, 9, 65, 66, 2, 1, 6, 2, 10, 127])));
    });
});
