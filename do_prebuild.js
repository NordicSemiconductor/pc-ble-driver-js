const path = require('path');

const pkg = require(path.resolve('package.json'));
const { exec } = require('child_process');
const os = require('os');
const { exit } = require('process');
const fs = require('fs');
const nodeAbi = require('node-abi');

('use strict');

function run_cmd(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            const output = {
                error,
                stdout,
                stderr,
            };

            if (error) {
                reject(output);
            }

            resolve(output);
        });
    });
}

async function run_prebuild(options) {
    console.log(`Pre-building for versions: ${options.versions}.`);

    // Could use npx here, but Windows find it difficult to find arguments.
    const bin_path_cmd = await run_cmd('npm bin').catch(output => output);

    if (bin_path_cmd.error) {
        throw new Error(
            `Could not find prebuild. Error: ${bin_path_cmd.error}`
        );
    }

    const bin_path = bin_path_cmd.stdout.trim();
    const prebuild_path = path.join(bin_path, 'prebuild');

    let prebuild_options = `--backend cmake-js -r ${options.runtime} --prepack "node do_prebuild.js"`;

    if (options.include_regex) {
        prebuild_options += ` --include-regex "${options.include_regex}"`;
    }

    options.versions.forEach(version => {
        prebuild_options += ` -t ${version}`;
    });

    if (options.arch) {
        prebuild_options += ` --arch="${options.arch}"`;
    }

    if (options.all_versions) {
        prebuild_options += ' --all';
    }

    let cmake_options = `-G="${options.generator}"`;
    cmake_options += ` --CDSHARED_LIBS_OUTPUT_DIRECTORY="${options.shared_install_dir}"`;
    cmake_options += ` --CDCMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE="${options.shared_install_dir}"`;
    cmake_options += ` --CDCMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG="${options.shared_install_dir}"`;
    cmake_options += ` --CDCMAKE_RUNTIME_OUTPUT_DIRECTORY="${options.shared_install_dir}"`;
    cmake_options += ` --CDCMAKE_LIBRARY_OUTPUT_DIRECTORY="${options.shared_install_dir}"`;
    cmake_options += ` --CDCMAKE_LIBRARY_OUTPUT_DIRECTORY_RELEASE="${options.shared_install_dir}"`;
    cmake_options += ` --CDCMAKE_LIBRARY_OUTPUT_DIRECTORY_DEBUG="${options.shared_install_dir}"`;

    if (options.prefer_gnu) {
        cmake_options += ' --prefer-gnu';
    }

    if (options.CC) {
        cmake_options += ` --cc="${options.CC}"`;
    }

    if (options.CXX) {
        cmake_options += ` --cxx="${options.CXX}"`;
    }

    const prebuild_cmd_input = `${prebuild_path} ${prebuild_options} -- ${cmake_options}`;
    console.log(`Prebuild command input: ${prebuild_cmd_input}`);
    const prebuild_cmd = await run_cmd(prebuild_cmd_input).catch(
        output => output
    );
    console.log(prebuild_cmd.stdout);
    console.log(prebuild_cmd.stderr);

    if (prebuild_cmd.error) {
        throw new Error(prebuild_cmd.error);
    }
}

async function decompress_local(options) {
    if (options.build_from_source) {
        throw new Error(
            'Build from source is requested. Skipping decompress of file.'
        );
    }

    let version = nodeAbi.getAbi(options.npm_config_target, options.npm_config_runtime);

    let { arch } = { options };

    if (!arch) {
        arch = os.arch();
    }

    const local_filename = path.join(
        options.prebuilds_dir,
        `${pkg.name}-v${pkg.version}-${options.runtime}-v${version}-${options.platform}-${arch}.tar.gz`
    );

    if (!fs.existsSync(local_filename)) {
        throw new Error(
            `Unable to decompress local prebuild. File does not exist: ${local_filename}`
        );
    }

    console.log(`Decompressing local filename: ${local_filename}.`);
    const decompress_cmd = await run_cmd(`tar xvf ${local_filename}`).catch(
        output => output
    );
    console.log(decompress_cmd.stdout);
    console.log(decompress_cmd.stderr);

    if (decompress_cmd.error) {
        throw new Error(decompress_cmd.error);
    }
}

async function run_install(options) {
    if (options.build_from_source) {
        throw new Error(
            'Build from source is requested. Skipping install from Github.'
        );
    }

    console.log('Trying to install prebuild from developer.nordicsemi.no...');
    console.log(`Runtime: ${options.runtime}`);

    let version = options.target;

    console.log(`Target: ${version}`);

    const cmd_input = `npx prebuild-install -r ${options.runtime} -t ${version} --verbose`;
    console.log(`Running command: ${cmd_input}`);
    const install_cmd = await run_cmd(cmd_input).catch(output => output);
    console.log(install_cmd.stdout);
    console.log(install_cmd.stderr);

    if (install_cmd.error) {
        throw new Error(install_cmd.error);
    }
}

function get_versions(runtime, from_abi, to_abi) {
    if (!runtime) {
        throw new Error('Run-time must be specified to get_versions.');
    }

    const retval = [];

    nodeAbi.allTargets.forEach(target => {
        let filter_res = target.runtime === runtime;

        if (from_abi) {
            filter_res =
                filter_res &&
                parseInt(target.abi, 10) >= parseInt(from_abi, 10);
        }

        if (to_abi) {
            filter_res =
                filter_res && parseInt(target.abi, 10) <= parseInt(to_abi, 10);
        }

        if (filter_res) {
            retval.push(target.target);
        }
    });

    console.log("get_versions_retval:" + JSON.stringify(retval));

    return retval;
}

const {
    CXX,
    CC,
    npm_config_arch,
    npm_config_build_from_source,
    npm_config_runtime,
    npm_config_target,
} = process.env;
const arch =
    npm_config_arch || (process.platform === 'win32' ? os.arch() : undefined);
const current_node_version = [process.version.replace('v', '')];

const options = {
    generator: 'Ninja',
    shared_install_dir: path.join(process.cwd(), 'Release'),
    prefer_gnu: true,
    CXX,
    CC,
    versions: [],
    include_regex: '(.dll|.so|.dylib|.dll|.node|.hex|.json)',
    arch,
    platform: process.platform,
    prebuilds_dir: 'prebuilds',
    build_from_source: npm_config_build_from_source,
    runtime: npm_config_runtime,
    target: npm_config_target || null,
    all_versions: false,
};

if (process.platform === 'win32') {
    if (arch === 'ia32') {
        options.generator = 'Visual Studio 15 2017';
    } else if (arch === 'x64') {
        options.generator = 'Visual Studio 15 2017 Win64';
    } else {
        console.log(`${arch} is not supported on Windows`);
        return 1;
    }
}

const args = process.argv;
let arg_is_generator = false;
let arg_is_version = false;
let arg_is_from_abi = false;
let arg_is_runtime = false;
const arg_versions = [];
let do_prebuild = true;
let from_abi = null;

args.forEach(arg => {
    arg = arg.trim();

    if (arg_is_generator) {
        options.generator = arg;
        arg_is_generator = false;
        return;
    }

    if (arg_is_version) {
        arg_versions.push(arg);
        arg_is_version = false;
        return;
    }

    if (arg_is_from_abi) {
        from_abi = arg;
        arg_is_from_abi = false;
        return;
    }

    if (arg_is_runtime) {
        options.runtime = arg;
        arg_is_runtime = false;
        return;
    }

    if (arg === '--currentversion') {
        arg_versions.push(current_node_version);
    }

    if (arg === '--decompress-only') {
        do_prebuild = false;
        console.log('Decompressing local prebuild.');
        decompress_local(options)
            .then(() => {
                exit(0);
            })
            .catch(err => {
                console.log(err.message);
                exit(1);
            });
    }

    if (arg === '--install-only') {
        do_prebuild = false;
        console.log('Installing prebuild from developer.nordicsemi.no.');
        run_install(options)
            .then(() => {
                console.log(
                    'Install from developer.nordicsemi.no was successful!'
                );
                exit(0);
            })
            .catch(err => {
                console.log(
                    '================================================================='
                );
                console.log('Install from developer.nordicsemi.no failed.');
                console.log('');
                console.log('NOTE:');
                console.log(
                    'The prebuild-install module will use a different strategy for fetching prebuilt binaries and will try to download from Github instead if it finds a token in ~/.prebuild-installrc'
                );
                console.log(
                    'Ensure that this token is not present by either deleting or temporarily moving it: ~/.prebuild-installrc'
                );
                console.log(
                    '================================================================='
                );
                console.log(`Error message was: ${err.message}`);
                exit(1);
            });
    }

    if (arg === '--generator') {
        arg_is_generator = true;
    }

    if (arg === '--version') {
        arg_is_version = true;
    }

    if (arg === '--from-abi-version') {
        arg_is_from_abi = true;
    }

    if (arg === '--runtime') {
        arg_is_runtime = true;
    }

    if (arg === '--all-versions') {
        console.log('Building for all versions.');
        options.all_versions = true;
    }
});

if (arg_versions.length !== 0) {
    console.log('Using versions from command line.');
    options.versions = arg_versions;
}

console.log("OPTIONS!::" + JSON.stringify(options));

if (from_abi) {
    console.log(
        `Using all ABI versions from version ${from_abi} for run-time ${options.runtime}.`
    );

    console.log("---------- START ----------");
    const got_versions = get_versions(options.runtime, from_abi, null);
    console.log("---------- END -------------");
    options.versions = options.versions.concat(got_versions);
}

if (do_prebuild) {
    console.log("options: " + JSON.stringify(options));
    run_prebuild(options)
        .then(() => {
            console.log('Done');
            exit(0);
        })
        .catch(err => {
            console.log('Done with error:');
            console.log(err);
            exit(1);
        });
}

return 0;