jest.mock('fs', () => {});
jest.mock('jszip', () => {});

import Dfu from '../dfu';

describe('performDFU', () => {

    let dfu;

    beforeEach(() => {
        dfu = new Dfu();
    });

    describe('when started without zip file path', () => {
        it('throws missing zip file path error', () => {
            expect(() => dfu.performDFU(undefined, "adapter", "instance")).toThrow();
        });
    });

    describe('when started without adapter', () => {
        it('throws missing adapter error', () => {
            expect(() => dfu.performDFU("path", undefined, "instance")).toThrow();
        });
    });

    describe('when started without instance ID', () => {
        it('throws missing instance ID error', () => {
            expect(() => dfu.performDFU("path", "adapter", undefined)).toThrow();
        });
    });

});
