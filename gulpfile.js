const {src, dest, series, watch} = require('gulp');
const fs                         = require("fs");
const path                       = require("path");
const pkg                        = require('./package.json')
const os                         = require('os')
const through                    = require('through2');
const babelc                     = require('@babel/core')
const babel                      = require('gulp-babel')
const less                       = require('gulp-less')
const lessc                      = require('less')
const postcss                    = require('gulp-postcss')
const autoprefix                 = require('autoprefixer')
const pxtorem                    = require('postcss-pxtorem')
const connect                    = require('gulp-connect')
const minimist                   = require('minimist')
const cleancss                   = require('gulp-clean-css')
const minifyCSS                  = require('clean-css');
const clean                      = require('gulp-rimraf')
const uglify                     = require('gulp-uglify')
const uglifyJs                   = require('uglify-js');
const relogger                   = require('gulp-strip-debug')
const validate                   = require('gulp-jsvalidate')
const notify                     = require('gulp-notify')
const header                     = require('gulp-header')
const sourceMap                  = require('gulp-sourcemaps')
const identityMap                = require('@gulp-sourcemaps/identity-map')
const include                    = require('gulp-include')
const rename                     = require('gulp-rename')

let modules = []
let babelRc = {
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
    ],
    "compact": true
};

const knownOptions = {
    string : 'env',
    default: {
        env: process.env.NODE_ENV || 'dev',
        m  : 'all'
    }
}
    , options      = minimist(process.argv.slice(2), knownOptions)

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
                        try {
                            if (fs.statSync(path.join('.', 'modules', f, 'src')).isDirectory()) {
                                if (f !== 'node_modules' && (options.m === 'all' || options.m === f)) {
                                    modules.push(f)
                                }
                            }
                        } catch (e) {
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

const cmt        = '/** <%= pkg.name %>-v<%= pkg.version %> <%= pkg.license %> License By <%= pkg.homepage %> */' + os.EOL + ' <%= js %>'
    , note       = [cmt, {
    pkg: pkg,
    js : ';'
}]
    , noteCss    = [cmt, {
    pkg: pkg,
    js : ''
}]
    , compile    = (stream, file, content, css, next) => {
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

    file.contents = Buffer.from(content);//替换文件内容
    stream.push(file);
    next();
}
    , compileTpl = (stream, file, content, css, next) => {
    let gps       = /^<template(\s+data-php)?>(.*)<\/template>/ims.test(content)
        , tpl     = gps ? RegExp.$2 : null
        , type    = gps ? RegExp.$1 : null
        , script  = /^<script[^>]*>(.*)<\/script>/ims.test(content)
        , code    = script ? RegExp.$1.trim() : ''
        , cnts    = []
        , minCss  = css.css
    file.dextname = type ? '.phtml' : '.tpl'

    if (css && options.env === 'pro') {
        minCss = new minifyCSS({
            compatibility: '*'
        }).minify(css.css).styles;
    }
    if (minCss) {
        cnts.push('<style>' + minCss + '</style>')
    }
    if (tpl) {
        cnts.push(tpl.trim())
    }
    if (script) {
        const fileOpts = Object.assign({}, babelRc, {
            filename        : file.path,
            filenameRelative: file.relative,
            sourceMap       : Boolean(file.sourceMap),
            sourceFileName  : file.relative
        });

        let sc         = babelc.transformSync(code, fileOpts)
            , php_code = type ? '<script><?php echo \'pageData = \',json_encode($pageData??[]);?>;' :
            '<script>var pageData = {$pageData|json_encode};{literal}'
        if (options.env === 'pro') {
            let min = uglifyJs.minify(sc.code, {warnings: true, fromString: true})
            if (!min.error) {
                sc.code = min.code
            } else {
                console.error(min.error)
                notify.onError(min.error)
            }
        }
        cnts.push(php_code + sc.code + (type ? '' : '{/literal}') + '</script>')
    }

    file.contents = Buffer.from(cnts.join("\n"));//替换文件内容
    stream.push(file);
    next();
};

const compileVue = () => {
    return through.obj(function (file, enc, cbx) {
        if (file.isNull()) {
            cbx(null, file);
            return;
        }
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
            })
        } else {
            compile(this, file, content, false, cbx)
        }
    });
};

const compileView = () => {
    return through.obj(function (file, enc, cbx) {
        if (file.isNull()) {
            cbx(null, file);
            return;
        }
        let content = file.contents.toString()
            , les   = /<style[^>]*>(.*)<\/style>/ims.test(content)
            , css   = les ? RegExp.$1.trim() : null;

        if (css) {
            //编译less
            lessc.render(css, {
                async    : false,
                fileAsync: false
            }).then((val) => {
                compileTpl(this, file, content, val, cbx)
            })
        } else {
            compileTpl(this, file, content, false, cbx)
        }
    });
}

const cleanTask = (cb, m) => {
    src([
        pathName('assets/js', m),
        pathName('assets/css', m),
        pathName('assets/font', m),
        pathName('assets/img', m),
        pathName('assets/addon', m),
        pathName('views/**/*.phtml', m),
    ], {
        allowEmpty: true
    }).pipe(clean())

    cb()
}

const copyImg = (cb, m) => {
    let gp = src([
        pathName('/src/**/*.png', m),
        pathName('/src/**/*.gif', m),
        pathName('/src/**/*.jpeg', m),
        pathName('/src/**/*.jpg', m),
        pathName('/src/**/*.webp', m)
    ], {
        allowEmpty: true
    })
    gp     = gp.pipe(dest(pathName('/assets', m)))

    if (options.watch) {
        gp.pipe(connect.reload());
    }

    cb();
};

const buildJs = (cb, m) => {
    let gp = src([pathName('/src/js/**/[^_]*.js', m)], {
        allowEmpty: true
    })

    if (options.env !== 'pro') {
        gp = gp.pipe(sourceMap.init()).pipe(identityMap());
    }
    if (options.env === 'pro') {
        gp = gp.pipe(include())
    }
    gp = gp.pipe(babel(babelRc)).on('error', (e) => {
        console.error(e.message)
        notify.onError(e.message)
    }).pipe(validate()).on('error', (e) => {
        notify.onError(e.message)
        console.error(e.message)
    })

    if (options.env === 'pro') {
        gp = gp.pipe(relogger())
        .pipe(uglify()).on('error', (e) => {
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
    let gp = src([pathName('/src/addon/**/*.js', 'backend')], {
        allowEmpty: true
    })

    if (options.env === 'pro') {
        gp = gp.pipe(relogger()).pipe(uglify()).on('error', (e) => {
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
    let gp = src([pathName('/src/less/[^_]*.less', m)], {
        allowEmpty: true
    })

    if (options.env !== 'pro') {
        gp = gp.pipe(sourceMap.init()).pipe(identityMap());
    }

    gp = gp.pipe(less()).on('error', e => {
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
        gp = gp.pipe(sourceMap.write())
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
    let gp = src([pathName('/src/css/**/*.css', 'backend')], {
        allowEmpty: true
    })

    if (options.env === 'pro') {
        gp = gp.pipe(cleancss()).pipe(header.apply(null, noteCss))
    }
    gp = gp.pipe(dest(pathName('/assets/css', 'backend')));

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

const copyAdminFont = (cb) => {
    let gp = src([pathName('/src/font/**', 'backend')], {
        allowEmpty: true
    })

    gp = gp.pipe(dest(pathName('/assets/font', 'backend')))

    if (options.watch) {
        gp.pipe(connect.reload());
    }

    cb();
};

const buildVue = (cb, f) => {
    let gp = src([pathName('/src/widget/*.vue', f)], {
        allowEmpty: true
    });
    if (options.env !== 'pro') {
        gp = gp.pipe(sourceMap.init()).pipe(identityMap());
    }
    gp = gp.pipe(compileVue())
    .pipe(babel(babelRc)).on('error', (e) => {
        console.error(e.message);
        notify.onError(e.message)
    })
    .pipe(validate()).on('error', (e) => {
        notify.onError(e.message);
        console.error(e.message)
    });

    if (options.env === 'pro') {
        gp = gp.pipe(relogger()).pipe(uglify()).on('error', (e) => {
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

const buildView = (cb, f) => {
    let gp = src([pathName('/src/views/**/*.vue', f)], {
        allowEmpty: true
    });

    gp.pipe(compileView())
    .pipe(rename((path, file) => {
        path.extname = file.dextname
    }))
    .pipe(dest(pathName('/views', f)));
    cb();
}

const watching = (cb, f) => {
    options.env   = "dev"
    options.watch = false
    watch([pathName('/src/widget/*.vue', f)], cb => {
        buildVue(cb, f)
    })
    watch([pathName('/src/views/**/*.vue', f)], cb => {
        buildView(cb, f)
    })
    watch([pathName('/src/js/**/*.js', f)], cb => {
        buildJs(cb, f)
    })
    watch([pathName('/src/less/[^_]*.less', f)], cb => {
        buildCss(cb, f)
    })
    if (f === 'backend') {
        watch(pathName('/src/css/**/*.css', f), cb => {
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
        buildView(cb, f)
        copyImg(cb, f)
        if (f === 'backend') {
            buildAdminCss(cb)
            buildAddonJs(cb)
            buildAddonCss(cb)
            copyAdminFont(cb)
        }
    })
    cb()
})

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