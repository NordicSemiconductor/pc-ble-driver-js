const exec = require('child_process').exec;

exec('git diff --cached --name-only', (error, stdout, stderr) => {
    if (error) {
        console.log(`pre-commit to build docs failed with error: ${error}.`);
        console.log(stderr);
        return 1;
    }

    const files = stdout.split(/\r?\n/);
    files.forEach(file => {
        // if a .js file in api/ is staged for commit, update the auto-generated api docs
        if (file.startsWith('api/') && file.endsWith('.js')) {
            console.log('Generating docs for api/ and adding them to this commit.');
            exec('node_modules/.bin/jsdoc api/ -d docs/ -c .jsdoc_conf.json', (error, stdout, stderr) => {
                if (error) {
                    console.log(`Generating docs failed with error: ${error}.`);
                    console.log(stderr);
                    return 1;
                }

                exec('git add docs/', (error, stdout, stderr) => {
                    if (error) {
                        console.log(`Adding generated docs to this commit failed with: ${error}.`);
                        console.log(stderr);
                        return 1;
                    }
                });
            });

            return;
        }
    });
});
