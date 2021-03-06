module.exports = function (grunt) {
    'use strict';

    // Change this
    var srcDir = 'lib';

    var excludeNodeDir = ['!**/node_modules/**'];

    grunt.initConfig({
        ts: {
            options: {
                target: 'es5',
                module: 'commonjs',
                sourceMap: false,
                compiler: './node_modules/typescript/bin/tsc',
            },
            dev: {
                src: [srcDir + '/**/*.ts'].concat(excludeNodeDir),
                watch: srcDir
            },
            build: {
                src: [srcDir + '/**/*.ts'].concat(excludeNodeDir),
            },
        },
    });

    grunt.loadNpmTasks('grunt-ts');
    grunt.registerTask('default', ['ts:dev']);
    grunt.registerTask('build', ['ts:build']);
};