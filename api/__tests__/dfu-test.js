const Dfu = require('../dfu');

describe('constructor', () => {

    const transportType = 'someType';
    const transportParameters = {};

    it('throws error if transportType is not provided', () => {
        expect(() => new Dfu(null, transportParameters)).toThrow();
    });

    it('throws error if transportParameters is not provided', () => {
        expect(() => new Dfu(transportType, null)).toThrow();
    });

    it('creates instance if all required parameters are provided', () => {
        expect(new Dfu(transportType, transportParameters)).toBeDefined();
    });
});
