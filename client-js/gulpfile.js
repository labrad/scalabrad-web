'use strict';

// Include Gulp & Tools We'll Use
var gulp = require('gulp');
var webpack = require('webpack-stream');
var htmlmin = require('gulp-htmlmin');
var $ = require('gulp-load-plugins')();
var sourcemaps = require('gulp-sourcemaps');
var eslint = require('gulp-eslint');
var tsc = require('gulp-typescript');
var typescript = require('typescript');
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync').create();
var path = require('path');
var fs = require('fs');
var url = require('url');
var merge = require('merge2');
var jasmineBrowser = require('gulp-jasmine-browser');
var jasmine = require('gulp-jasmine');
var gitDescribe = require('git-describe');

var minimist = require('minimist');

var knownOptions = {
  string: 'api-host',
  default: { 
    'api-host': 'localhost:7667'
  }
};

var options = minimist(process.argv.slice(2), knownOptions);

var typescriptOptions = {
  typescript: typescript,
  target: 'ES6',
  module: 'ES6',
  declarationFiles: false,
  noResolve: true,
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  noEmitOnError: true
};

var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

// Get version of the client code from git
function gitVersion() {
  // use raw version from git-describe, but drop leading 'v'
  return gitDescribe.gitDescribeSync(__dirname).raw.substring(1);
}

// Get a tag that can be inserted in index.html to pass info to app
function metaTag(name, content) {
  // TODO: should properly escape strings here
  return '<meta name="' + name + '" content="' + content + '">';
}

// Lint all custom TypeScript files.
gulp.task('eslint', function () {
  return gulp.src('app/**/*.ts')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

// Compile TypeScript and include references to library and app .d.ts files.
gulp.task('compile-ts', function () {
  var tsResult = gulp.src(['app/**/*.ts', 'typings/**/*.ts'])
    .pipe(sourcemaps.init())
    .pipe(tsc(typescriptOptions));

  return merge([
    tsResult.dts.pipe(gulp.dest('.tmp/app')),
    tsResult.js.pipe(sourcemaps.write('.')).pipe(gulp.dest('.tmp/app'))
  ]);
});

gulp.task('compile-test', function () {
  var tsResult = gulp.src(['app/**/*.ts','test/**/*.ts', 'typings/**/*.ts'])
    .pipe(sourcemaps.init())
    .pipe(tsc(typescriptOptions));

  return merge([
    tsResult.dts.pipe(gulp.dest('.tmp/')),
    tsResult.js.pipe(sourcemaps.write('.')).pipe(gulp.dest('.tmp/'))
  ]);
});

gulp.task('jasmine-browser', ['build-test'], function() {
  return gulp.src(['.tmp/testing/specBundle.js'])
    .pipe(jasmineBrowser.specRunner())
    .pipe(jasmineBrowser.server({port: 8888}));
});

/**
 * Build a self-executing javascript bundle using webpack.
 */
function buildBundle(mainModule, outputFile, callback) {
  var inputFile = '.tmp/' + mainModule + '.js';

  var dirname = path.dirname(outputFile);
  var basename = path.basename(outputFile);
  gulp.src(inputFile)
    .pipe(webpack({output: {filename: basename}}))
    .pipe(gulp.dest(dirname + '/'))
    .on('end', callback);
}

/*
 * Create bundle of main app code.
 */
gulp.task('bundle', ['compile-ts'], function(callback) {
  gulp.src(['node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js'])
    .pipe(gulp.dest('.tmp/scripts/'));
  buildBundle('app/scripts/app', '.tmp/scripts/bundle.js', callback);
});

/*
 * Create bundle of test code.
 */
gulp.task('build-test', ['compile-test', 'compile-ts']);

var styleTask = function (stylesPath, srcs) {
  return gulp.src(srcs.map(function(src) {
      return path.join('app', stylesPath, src);
    }))
    .pipe($.changed(stylesPath, {extension: '.css'}))
    .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(gulp.dest('.tmp/' + stylesPath))
    .pipe($.if('*.css', $.cssmin()))
    .pipe(gulp.dest('dist/' + stylesPath))
    .pipe($.size({title: stylesPath}));
};

// Compile and Automatically Prefix Stylesheets
gulp.task('styles', function () {
  return styleTask('styles', ['**/*.css']);
});

// Optimize Images
gulp.task('images', function () {
  return gulp.src('app/images/**/*')
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest('dist/images'))
    .pipe($.size({title: 'images'}));
});

// Copy All Files At The Root Level (app)
gulp.task('copy', function () {
  var app = gulp.src([
    '.tmp/**/*.js',
    '.tmp/**/*.js.map',
    'app/*',
    '!app/test',
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));

  return merge(app)
    .pipe($.size({title: 'copy'}));
});

// copy bundle files to prod
gulp.task('copy-bundle', function() {
  gulp.src('.tmp/scripts/webcomponents-bundle.js')
    .pipe(gulp.dest('dist/scripts/'));
  gulp.src('.tmp/scripts/bundle.js')
    .pipe(gulp.dest('dist/scripts/'));
});

// Copy Web Fonts To Dist
gulp.task('fonts', function () {
  return gulp.src(['app/fonts/**'])
    .pipe(gulp.dest('dist/fonts'))
    .pipe($.size({title: 'fonts'}));
});

// Scan Your HTML For Assets & Optimize Them
gulp.task('html', function () {
  var assets = $.useref.assets({searchPath: ['.tmp', 'app', 'dist']});

  return gulp.src(['app/**/*.html', '!app/{elements,test}/**/*.html'])
    // Add version info
    .pipe($.if('*.html', $.replace('<!-- DEV_MODE_CONFIG -->',
                                   metaTag("labrad-clientVersion", gitVersion()))))
    // Concatenate And Minify JavaScript
    .pipe($.if('*.js', $.uglify({preserveComments: 'some'})))
    // Concatenate And Minify Styles
    // In case you are still using useref build blocks
    .pipe($.if('*.css', $.cssmin()))
    .pipe(assets.restore())
    .pipe($.useref())
    // Minify Any HTML
    .pipe($.if('*.html', htmlmin({
      collapseWhitespace: true
    })))
    // Output Files
    .pipe(gulp.dest('dist'))
    .pipe($.size({title: 'html'}));
});

// Inject dev mode app configuration into index.html.
gulp.task('insert-dev-config', function () {
  return gulp.src(['app/index.html'])
    .pipe($.replace('<!-- DEV_MODE_CONFIG -->', [
                      '<!-- DEV_MODE_CONFIG -->',
                      metaTag("labrad-apiHost", "ws://" + options['api-host']),
                      metaTag("labrad-clientVersion", gitVersion())
                    ].join("\n    ")))
    .pipe(gulp.dest('.tmp'));
});

// Clean Output Directory
gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

// Watch Files For Changes & Reload
gulp.task('serve', ['bundle', 'insert-dev-config', 'styles', 'images'], function () {
  var folder = path.resolve(__dirname, ".");
  browserSync.init({
    notify: false,
    open: false,
    ghostMode: false,
    server: {
      baseDir: ['.tmp', 'app'],
      middleware: function(req, res, next) {
        var fileName = url.parse(req.url);
        fileName = fileName.href.split(fileName.search).join("");
        var fileExists = fs.existsSync(folder + fileName) ||
                         fs.existsSync(folder + '/.tmp' + fileName) ||
                         fs.existsSync(folder + '/app' + fileName);
        if (!fileExists && fileName.indexOf("browser-sync-client") < 0) {
          console.log("request for", req.url, "rewritten to /index.html");
          req.url = "/index.html";
        }
        return next();
      }
    }
  });

  var reload = browserSync.reload;
  gulp.watch(['app/**/*.html'], reload);
  gulp.watch(['app/styles/**/*.css'], ['styles', reload]);
  gulp.watch(['app/elements/**/*.css'], ['elements', reload]);
  gulp.watch(['app/{scripts,elements}/**/*.ts'], ['bundle', reload]);
  gulp.watch(['app/images/**/*'], reload);
});

gulp.task('test', ['build-test'], function() {
  return gulp
    .src('.tmp/testing/spec-bundle.js')
    .pipe(jasmine());
});

gulp.task('watch', function () {
  watch('**/*.js', batch(function (events, done) {
      gulp.start('build', done);
  }));
});

gulp.task('test-watch', function () {
  gulp.watch(['app/{scripts,elements}/**/*.ts'], ['test']);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], function () {
  browserSync.init({
    notify: false,
    open: false,
    ghostMode: false,
    server: 'dist'
  });
});

// Build Production Files, the Default Task
gulp.task('default', ['clean'], function (cb) {
  runSequence(
    'bundle',
    ['copy', 'styles'],
    ['images', 'fonts', 'html'],
    'copy-bundle',
    cb);
});

// Load custom tasks from the `tasks` directory
try { require('require-dir')('tasks'); } catch (err) {}
