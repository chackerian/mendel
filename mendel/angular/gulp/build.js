'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');

var $ = require('gulp-load-plugins')({
  pattern: ['gulp-*', 'main-bower-files', 'uglify-save-license', 'del']
});

gulp.task('partials', function () {
  return gulp.src([
    path.join(conf.paths.src, '/app/**/*.html'),
    path.join(conf.paths.tmp, '/serve/app/**/*.html')
  ])
    .pipe($.htmlmin({
      removeEmptyAttributes: true,
      removeAttributeQuotes: true,
      collapseBooleanAttributes: true,
      collapseWhitespace: true
    }))
    .pipe($.angularTemplatecache('templateCacheHtml.js', {
      module: 'mendel',
      root: 'app'
    }))
    .pipe(gulp.dest(conf.paths.tmp + '/partials/'));
});

gulp.task('html', ['inject', 'partials'], function () {
  var partialsInjectFile = gulp.src(path.join(conf.paths.tmp, '/partials/templateCacheHtml.js'), { read: false });
  var partialsInjectOptions = {
    starttag: '<!-- inject:partials -->',
    ignorePath: path.join(conf.paths.tmp, '/partials'),
    addRootSlash: false
  };

  var htmlFilter = $.filter('*.html', { restore: true });
  var jsFilter = $.filter('**/*.js', { restore: true });
  var cssFilter = $.filter('**/*.css', { restore: true });

  return gulp.src(path.join(conf.paths.tmp, '/serve/*.html'))
    .pipe($.inject(partialsInjectFile, partialsInjectOptions))
    .pipe($.useref())
    .pipe(jsFilter)
    .pipe($.sourcemaps.init())
    .pipe($.ngAnnotate())
    .pipe($.uglify({ preserveComments: $.uglifySaveLicense })).on('error', conf.errorHandler('Uglify'))
    // .pipe($.rev())
    .pipe($.sourcemaps.write('maps'))
    .pipe(jsFilter.restore)
    .pipe(cssFilter)
    // .pipe($.sourcemaps.init())
    .pipe($.cssnano())
    // .pipe($.rev())
    // .pipe($.sourcemaps.write('maps'))
    .pipe(cssFilter.restore)
    // .pipe($.revReplace())
    .pipe(htmlFilter)
    .pipe($.htmlmin({
      removeEmptyAttributes: true,
      removeAttributeQuotes: false,
      collapseBooleanAttributes: true,
      collapseWhitespace: false,
      removeComments: false,
      preserveLineBreaks: true,
    }))
    .pipe(htmlFilter.restore)
    .pipe(gulp.dest(path.join(conf.paths.dist, '/')))
    .pipe($.size({ title: path.join(conf.paths.dist, '/'), showFiles: true }));
  });

// Only applies for fonts from bower dependencies
// Custom fonts are handled by the "other" task
gulp.task('fonts', function () {
  return gulp.src($.mainBowerFiles())
    .pipe($.filter('**/*.{eot,otf,svg,ttf,woff,woff2}'))
    .pipe($.flatten())
    .pipe(gulp.dest(path.join(conf.paths.dist, '/fonts/')));
});

gulp.task('other', function () {
  var fileFilter = $.filter(function (file) {
    return file.stat.isFile();
  });

  return gulp.src([
    path.join(conf.paths.src, '/**/*'),
    path.join('!' + conf.paths.src, '/**/*.{html,css,js,scss}')
  ])
    .pipe(fileFilter)
    .pipe(gulp.dest(path.join(conf.paths.dist, '/')));
});

gulp.task('clean', function () {
  return $.del([path.join(conf.paths.dist, '/'), path.join(conf.paths.tmp, '/'), path.join(conf.paths.djangoTemplates, '/')], {force: true});
});

gulp.task('build', ['html', 'fonts', 'other']);


/*
`gulp django`

Copies built index.html file to Django's /templates directory
and replaces .js and .css files with {% static 'filename' %} tags 
for use with Django staticfiles
*/

gulp.task('django', ['build'], function () {

  var djangoEnv = "<script>window.djangoEnv = {};</script>";
  var djangoDebug = "<script>var DEBUG = '{{DEBUG}}'; DEBUG = (DEBUG === 'False' ? false : true); window.djangoEnv['DEBUG'] = DEBUG;</script>";
  var djangoCsrf = "<script>var csrf_token = '{{ csrf_token }}'; window.djangoEnv['csrf_token'] = csrf_token;</script>";

  return gulp.src(path.join(conf.paths.dist, '/index.html'))
    .pipe($.replace('<!-- replace:load staticfiles -->', "{% load staticfiles %}"))
    .pipe($.replace('<!-- replace:set up window.djangoEnv -->', djangoEnv))
    .pipe($.replace('<!-- replace:expose Django environment variables -->', djangoDebug))
    .pipe($.replace('<!-- replace:expose Django CSRF token -->', djangoCsrf))
    .pipe($.replace('styles/app.css', "{% static 'styles/app.css' %}"))
    .pipe($.replace('styles/vendor.css', "{% static 'styles/vendor.css' %}"))
    .pipe($.replace('scripts/app.js', "{% static 'scripts/app.js' %}"))
    .pipe($.replace('scripts/vendor.js', "{% static 'scripts/vendor.js' %}"))
    .pipe(gulp.dest(path.join(conf.paths.djangoTemplates, '/')));
});
