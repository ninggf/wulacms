const config                               = require('./config.json')
const {src, dest, series, parallel, watch} = require('gulp');
const fs                                   = require("fs");
const path                                 = require("path");
const pkg                                  = require('./package.json')
const os                                   = require('os')
const through                              = require('through2');
const babel                                = require('gulp-babel')
const less                                 = require('gulp-less')
const lessc                                = require('less')
const postcss                              = require('gulp-postcss')
const autoprefix                           = require('autoprefixer')
const pxtorem                              = require('postcss-pxtorem')
const connect                              = require('gulp-connect')
const minimist                             = require('minimist')
const cleancss                             = require('gulp-clean-css')
const minifyCSS                            = require('clean-css');
const clean                                = require('gulp-rimraf')
const uglify                               = require('gulp-uglify')
const relogger                             = require('gulp-remove-logging')
const validate                             = require('gulp-jsvalidate')
const notify                               = require('gulp-notify')
const header                               = require('gulp-header')
const sourceMap                            = require('gulp-sourcemaps')
const identityMap                          = require('@gulp-sourcemaps/identity-map')
const replace                              = require('gulp-replace');
let modules                                = []
let babelRc                                = {
    "presets": [
        [
            "@babel/preset-env",
            {
                "loose"             : true,
                "modules"           : false,
                "forceAllTransforms": true
            }
        ]
    ],
    "plugins": [
        "@babel/plugin-proposal-class-properties"
    ]
};

const knownOptions = {
          string : 'env',
          default: {
              env: process.env.NODE_ENV || 'dev',
              m  : 'all'
          }
      },
      options      = minimist(process.argv.slice(2), knownOptions),
      ccfg         = options.env === "pro" ? config.pro : config.dev,
      baseURL      = ccfg.baseURL

const pathName = (path, f) => {
    let path_arr = [...path], reverse = 0;
    switch (path_arr[0]) {
        case '.':// ./src/mjs
            path_arr[0] = ''
            break
        case '/':// /src/mjs
            break
        case '!':// !src/mjs
            path_arr[0] = ''
            reverse     = 1;
            break
        default: // src/mjs
            path_arr.unshift('/')
            break;
    }
    return reverse ? '!' + './modules/' + f + path_arr.join('') : './modules/' + f + path_arr.join('');
}

//获取子目录gulpfile.js 
const getModules = cb => {
    let promise_list = [];
    new Promise((resolve) => {
        //遍历当前目录
        fs.readdir(path.join('.', 'modules'), (err, data) => {
            resolve(data);
        })
    }).then(arr => {
        arr.forEach(f => {
                promise_list.push(
                    new Promise(resovle => {
                        if (fs.statSync(path.join('.', 'modules', f)).isDirectory()) {
                            if (f !== 'node_modules' && (options.m === 'all' || options.m === f)) {
                                modules.push(f)
                            }
                        }
                        resovle();
                    })
                )
            }
        )
        Promise.all(promise_list).then(() => {
            cb()
        })
    })
}

const cmt            = '/** <%= pkg.name %>-v<%= pkg.version %> <%= pkg.license %> License By <%= pkg.homepage %> */' + os.EOL + ' <%= js %>',
      note           = [cmt, {
          pkg: pkg,
          js : ';'
      }],
      noteCss        = [cmt, {
          pkg: pkg,
          js : ''
      }], layuiTasks = {
          minjs(cb) {
              let mod  = options.mod ? function () {
                      return '(' + options.mod.replace(/,/g, '|') + ')';
                  }() : '',
                  srcx = [
                      pathName('layui/src/**/*' + mod + '.js', 'backend'),
                      pathName('!layui/src/**/mobile/*.js', 'backend'),
                      pathName('!layui/src/lay/**/mobile.js', 'backend'),
                      pathName('!layui/src/lay/all.js', 'backend'),
                      pathName('!layui/src/lay/all-mobile.js', 'backend')
                  ]
              let gp   = src(srcx)

              if (options.env === 'pro') {
                  gp = gp.pipe(uglify())
              }
              gp = gp.pipe(dest(pathName('./assets/lib', 'backend')))

              cb()
          },
          mincss(cb) {
              const srcx = [
                  pathName('layui/src/css/**/*.css', 'backend'), pathName('!layui/src/css/**/font.css', 'backend')
              ]

              let gp = src(srcx)

              if (options.env === 'pro') {
                  gp = gp.pipe(cleancss())
              }

              gp = gp.pipe(dest(pathName('./assets/lib/css', 'backend')))

              cb()
          },
          font(cb) {
              src(pathName('layui/src/font/*', 'backend'))
              .pipe(dest(pathName('./assets/lib/font', 'backend')))

              cb()
          },
          mv(cb) {
              const srcx = [pathName('layui/src/**/*.{png,jpg,gif,html,mp3,json}', 'backend')]

              src(srcx).pipe(dest(pathName('./assets/lib', 'backend')))

              cb()
          }
      };

const compileVue = function () {
    //编译js
    const compile = (stream, file, content, css, next) => {
        let gps    = /<template>(.*)<\/template>/ims.test(content),
            tpl    = gps ? RegExp.$1 : null;
        let script = /<script[^>]*>(.*)<\/script>/ims.test(content);
        if (tpl && script) {
            content = RegExp.$1.trim().replace('$tpl$', tpl.trim())
        } else if (script) {
            content = RegExp.$1.trim()
        }
        if (css) {
            let minCss = new minifyCSS({
                compatibility: '*'
            }).minify(css.css).styles;

            let styleId = css.styleID;
            content     = `layui.injectCss('cmp-${styleId}',\`${minCss}\`);` + content;
        }

        file.contents = Buffer.from(content);
        stream.push(file);
        next();
    };
    return through.obj(function (file, enc, cbx) {
        let content = file.contents.toString();

        let les = /<style\s+id\s*=\s*"([^"]+)"[^>]*>(.*)<\/style>/ims.test(content),
            css = les ? RegExp.$2.trim() : null;
        if (css) {
            let styleID = RegExp.$1.trim();
            //编译less
            lessc.render(css, {
                async    : false,
                fileAsync: false
            }).then((val) => {
                val.styleID = styleID;
                compile(this, file, content, val, cbx)
            }).catch((err) => {
                compile(this, file, content, false, cbx);
            });
        } else {
            compile(this, file, content, false, cbx)
        }
    });
};

const cleanTask = (cb, m) => {
    src([
        pathName('assets/js/*', m),
        pathName('assets/css/*', m),
        pathName('assets/addon/*', m),
        pathName('assets/admin.css', m),
    ], {
        allowEmpty: true
    }).pipe(clean())

    cb()
}

const buildJs = (cb, m) => {
    let gp = src([pathName('/src/js/*.js', m)], {
        allowEmpty: true
    })

    if (options.env !== 'pro') {
        gp = gp.pipe(sourceMap.init()).pipe(identityMap());
    }

    gp = gp.pipe(replace('$~', baseURL + 'modules/' + m + '/assets'))
    .pipe(replace('$@', baseURL + 'modules/'))
    .pipe(babel(babelRc)).on('error', (e) => {
        console.error(e.message)
        notify.onError(e.message)
    }).pipe(validate()).on('error', (e) => {
        notify.onError(e.message)
        console.error(e.message)
    })

    if (options.env === 'pro') {
        gp = gp.pipe(relogger({
            replaceWith: 'void 0'
        })).pipe(uglify()).on('error', (e) => {
            notify.onError(e.message)
            console.error(['js', e.message, e])
        }).pipe(header.apply(null, note))
    }

    if (options.env !== 'pro') {
        gp = gp.pipe(sourceMap.write())
    }

    gp = gp.pipe(dest(pathName('/assets/js', m)))

    if (options.watch) {
        gp.pipe(connect.reload());
    }

    cb();
}

const buildAddonJs = (cb) => {
    let gp = src([pathName('/src/addon/*.js', 'backend'), pathName('/src/addon/**/*.js', 'backend')], {
        allowEmpty: true
    })

    if (options.env === 'pro') {
        gp = gp.pipe(uglify()).on('error', (e) => {
            notify.onError(e.message)
            console.error(['js', e.message, e])
        }).pipe(header.apply(null, note))
    }

    gp = gp.pipe(dest(pathName('/assets/addon', 'backend')))

    if (options.watch) {
        gp.pipe(connect.reload());
    }

    cb();
}

const buildCss = (cb, m) => {
    console.log('build css for ' + m)

    let gp = src([pathName('/src/less/[^_]*.less', m)], {
        allowEmpty: true
    })

    if (options.env !== 'pro') {
        gp = gp.pipe(sourceMap.init()).pipe(identityMap());
    }

    gp = gp.pipe(replace('$~', baseURL + 'modules/' + m + '/assets'))
    .pipe(replace('$@', baseURL + 'modules/'))
    .pipe(less()).on('error', e => {
        console.error(e.message)
    })
    .pipe(postcss([pxtorem({
        rootValue: 16
    }), autoprefix()]))
    .on('error', e => {
        console.error(e.message)
    })

    // write sourcemap
    if (options.env !== 'pro') {
        gp = gp.pipe(sourceMap.write(''))
    }
    if (options.env === 'pro') {
        gp = gp.pipe(cleancss()).pipe(header.apply(null, noteCss))
    }
    gp = gp.pipe(dest(pathName('/assets/css', m)));

    if (options.watch) {
        gp.pipe(connect.reload());
    }

    cb();
}

const buildAdminCss = (cb) => {
    let gp = src([pathName('/src/css/*.css', 'backend')], {
        allowEmpty: true
    })

    if (options.env === 'pro') {
        gp = gp.pipe(cleancss()).pipe(header.apply(null, noteCss))
    }
    gp = gp.pipe(dest(pathName('/assets', 'backend')));

    if (options.watch) {
        gp.pipe(connect.reload());
    }

    cb();
}

const buildAddonCss = (cb) => {
    let gp = src([pathName('/src/addon/**/*.css', 'backend')], {
        allowEmpty: true
    })

    if (options.env === 'pro') {
        gp = gp.pipe(cleancss()).pipe(header.apply(null, noteCss))
    }
    gp = gp.pipe(dest(pathName('/assets/addon', 'backend')));

    if (options.watch) {
        gp.pipe(connect.reload());
    }

    cb();
}

const buildVue = (cb, f) => {
    let gp = src([pathName('/src/widget/*.vue', f)], {
        allowEmpty: true
    });
    if (options.env !== 'pro') {
        gp = gp.pipe(sourceMap.init()).pipe(identityMap());
    }
    gp = gp.pipe(replace('$~', baseURL + 'modules/' + f + '/assets'))
    .pipe(replace('$@', baseURL + 'modules/'))
    .pipe(compileVue())
    .pipe(babel(babelRc)).on('error', (e) => {
        console.error(e.message);
        notify.onError(e.message)
    })
    .pipe(validate()).on('error', (e) => {
        notify.onError(e.message);
        console.error(e.message)
    });

    if (options.env === 'pro') {
        gp = gp.pipe(relogger({
            replaceWith: 'void 0'
        })).pipe(uglify()).on('error', (e) => {
            notify.onError(e.message)
            console.error(['widget', e.message])
        }).pipe(header.apply(null, note))
    }
    if (options.env !== 'pro') {
        gp = gp.pipe(sourceMap.write())
    }
    gp.pipe(dest(pathName('/assets/js', f)));
    cb();
}

const watching = (cb, f) => {
    options.env   = "dev"
    options.watch = false
    watch([pathName('/src/widget/*.vue', f)], cb => {
        buildVue(cb, f)
    })
    watch([pathName('/src/js/*.js', f)], cb => {
        buildJs(cb, f)
    })
    watch([pathName('/src/less/[^_]*.less', f)], cb => {
        buildCss(cb, f)
    })
    if (f === 'backend') {
        watch(pathName('/src/css/*.css', f), cb => {
            buildAdminCss(cb)
        });
        watch([pathName('/src/addon/**/*.js', f)], cb => {
            buildAddonJs(cb)
        })
        watch([pathName('/src/addon/**/*.css', f)], cb => {
            buildAddonCss(cb)
        })
    }
    cb()
}

exports.default = series(getModules, cb => {
    modules.forEach(f => {
        buildCss(cb, f)
        buildJs(cb, f)
        buildVue(cb, f)
        if (f === 'backend') {
            buildAdminCss(cb)
            buildAddonJs(cb)
            buildAddonCss(cb)
        }
    })
    cb();
});

exports.build = exports.default

exports.clean = series(getModules, cb => {
    modules.forEach(f => {
        cleanTask(cb, f)
    })
    cb();
})

exports.watch = series(getModules, cb => {
    modules.forEach(f => {
        watching(cb, f)
    })
    cb();
})

exports.layui = fs.existsSync(pathName('layui', 'backend')) ? parallel(layuiTasks.minjs, layuiTasks.mincss, layuiTasks.mv, layuiTasks.font) : cb => {
    console.log('layui src does not exist!')
    cb()
}