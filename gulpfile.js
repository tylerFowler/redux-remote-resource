const gulp       = require('gulp');
const clean      = require('gulp-clean');
const rename     = require('gulp-rename');
const eslint     = require('gulp-eslint');
const browserify = require('browserify');
const babelify   = require('babelify');
const uglify     = require('gulp-uglify');
const tape       = require('gulp-tape');

const source     = require('vinyl-source-stream');
const buffer     = require('vinyl-buffer');

gulp.task('clean:dist', () =>
  gulp.src('./dist', { read: false })
    .pipe(clean())
);

gulp.task('lint', () =>
  gulp.src('lib/*.js')
    .pipe(eslint())
    .pipe(eslint.failAfterError())
);

gulp.task('build:dist', [ 'clean:dist', 'lint' ], () =>
  browserify({
    entries: 'lib/index.js',
    standalone: 'ReduxRemoteResource',
    debug: true,
    transform: [
      [ babelify, { presets: [ 'es2015', 'stage-0' ] } ]
    ]
  }).bundle()
    .pipe(source('redux-remote-resource.js'))
    .pipe(buffer())
    .pipe(gulp.dest('./dist'))
);

gulp.task('build:min', [ 'build:dist' ], () =>
  gulp.src('./dist/redux-remote-resource.js')
    .pipe(rename('redux-remote-resource.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'))
);

gulp.task('test', () =>
  gulp.src('tests/*.spec.js')
    .pipe(tape({ reporter: require('tap-colorize')() }))
);

gulp.task('build', [ 'clean:dist', 'build:dist', 'build:min' ]);

gulp.task('default', [ 'clean:dist', 'test', 'lint', 'build:dist', 'build:min' ]);
