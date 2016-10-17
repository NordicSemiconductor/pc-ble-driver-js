const fs = require('fs');
const crc = require('crc');

function crc32FromFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(crc.crc32(data));
            }
        });
    });
}

module.exports = {
    crc32FromFile
};
