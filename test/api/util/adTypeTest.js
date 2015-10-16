'use strict';

var AdType = require('../../../api/util/adType.js');
var assert = require('assert');

describe('AdType', function() {
    it('should convert a advertisement object to a byte array', function () {
        var advertisingDataA = {
            shortLocalName: 'MyShortName',
            completeLocalName: 'MyCompleteName',
            flags: ['GeneralDiscMode', 'BrEdrNotSupported', 'LeOnlyLimitedDiscMode'],
            txPowerLevel: 0,
            '16bitServiceUuidMoreAvailable': ['DE-AD', 'BE-EF'],
            '16bitServiceUuidComplete': ['BE-EF', 'DE-AD'],
            raw: []
        };

        var buffer = AdType.convertToBuffer(advertisingDataA);
        assert.ok(buffer);
    });
});
