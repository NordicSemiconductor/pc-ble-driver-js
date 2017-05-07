'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs-extra');

function harvest() {
    let runtime = 'node';
    let runtimeVersion = process.versions.node;

    if (process.versions.electron) {
        runtime = 'electron';
        runtimeVersion = process.versions.electron;
    }

    const outDir = 'build/Release';

    if (!fs.existsSync(outDir)) {
        console.log(`Directory ${outDir} does not exist. Have you built the module?`);
        return -1;
    }

    const srcFiles = fs.readdirSync(outDir);
    const destPath = path.join('compiled', runtime, runtimeVersion, os.platform(), os.arch());

    if (!fs.existsSync(destPath)) {
        fs.mkdirsSync(destPath);
    }

    srcFiles.forEach(srcFile => {
        const fullSrcPath = path.join(outDir, srcFile);
        const fullDestPath = path.join(destPath, srcFile);
        const stat = fs.lstatSync(fullSrcPath);

        if (!stat.isDirectory() && srcFile.endsWith('.node')) {
            console.log(`Copying file ${fullSrcPath} to ${fullDestPath}.`);
            fs.copySync(fullSrcPath, fullDestPath);
        }
    });
}

harvest();

