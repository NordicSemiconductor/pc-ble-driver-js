'use strict';

var AdType = require('../../../api/util/adType.js');
var assert = require('assert');

describe('AdType', function() {
    it('should convert a advertisement object to a byte array', function () {
        var advertisingDataA = {
            flags: ['leGeneralDiscMode', 'brEdrNotSupported'],
            txPowerLevel: 0,
            'incompleteListOf32BitServiceUuids': ['DE-AD-BE-EF']            
        };

        var buffer = AdType.convertToBuffer(advertisingDataA);
        assert.ok(buffer);

        console.log(buffer);
    });
});
