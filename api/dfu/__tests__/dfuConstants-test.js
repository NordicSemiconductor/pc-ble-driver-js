'use strict';

const ControlPointOpcode = require('../dfuConstants').ControlPointOpcode;
const ResultCode = require('../dfuConstants').ResultCode;
const getOpCodeName = require('../dfuConstants').getOpCodeName;
const getResultCodeName = require('../dfuConstants').getResultCodeName;

describe('getOpCodeName', () => {
    it('returns "CREATE" when code for CREATE is given', () => {
        expect(getOpCodeName(ControlPointOpcode.CREATE)).toEqual('CREATE');
    });

    it('returns "UNKNOWN" when unknown code 0x61 is given', () => {
        expect(getOpCodeName(0x61)).toEqual('UNKNOWN');
    });
});

describe('getResultCodeName', () => {
    it('returns "SUCCESS" when code for SUCCESS is given', () => {
        expect(getResultCodeName(ResultCode.SUCCESS)).toEqual('SUCCESS');
    });

    it('returns "UNKNOWN" when unknown code 0x0B is given', () => {
        expect(getResultCodeName(0x0B)).toEqual('UNKNOWN');
    });
});
