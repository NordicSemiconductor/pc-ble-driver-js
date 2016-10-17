jest.mock('fs', () => {});
jest.mock('jszip', () => {});

import Dfu from '../dfu';

describe('performDFU', () => {

    const dfu = new Dfu();

    describe('when started without zip file path', () => {
        it('throws missing zip file path error', () => {
            expect(() => dfu.performDFU()).toThrowError();
        });
    });

});
