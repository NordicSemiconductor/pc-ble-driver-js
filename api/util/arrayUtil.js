'use strict';

function splitArray(data, chunkSize) {
    if (chunkSize < 1) {
        throw new Error(`Invalid chunk size: ${chunkSize}`);
    }
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
        if (i + chunkSize >= data.length) {
            chunks.push(data.slice(i));
        } else {
            chunks.push(data.slice(i, i + chunkSize));
        }
    }
    return chunks;
}

module.exports = {
    splitArray,
};
