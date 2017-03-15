const exec = require('child_process').exec;

exec('git diff --cached --name-only', (error, stdout, stderr) => {
    if (error) {
        console.log(`pre-commit to build docs failed with error: ${error}.`);
        console.log(stderr);
        return 1;
    }

    const files = stdout.split(/\r?\n/);
    files.forEach(file => {
        // generate docs for files that have been staged for commit in `./api`
        // for now docs will not be generated for files in any of `./api`'s sub directories
        if (file.startsWith('api/') && (file.split('/').length - 1 === 1)) {
            console.log(`Generating docs for ${file} and adding them to this commit.`);
            exec(`./node_modules/.bin/jsdoc ${file} -d docs/`, (error, stdout, stderr) => {
                if (error) {
                    console.log(`Generating docs for ${file} failed with error: ${error}.`);
                    console.log(stderr);
                    return 1;
                }

                exec(`git add docs/`, (error, stdout, stderr) => {
                    if (error) {
                        console.log(`Adding generated docs to this commit failed with: ${error}.`);
                        console.log(stderr);
                        return 1;
                    }
                });
            });
        }
    });
});
