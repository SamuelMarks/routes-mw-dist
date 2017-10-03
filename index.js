"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger = require("bunyan");
const restify = require("restify");
const path_1 = require("path");
const restifyInitApp = (app, with_app, skip_app_logging, skip_app_version_routes, package_, version_routes_kwargs) => {
    if (with_app != null)
        app = with_app(app);
    app.use(restify.plugins.queryParser());
    app.use(restify.plugins.bodyParser());
    if (!skip_app_logging) {
        const event = 'after';
        app.on(event, restify.plugins.auditLogger({
            event, log: Logger.createLogger({
                name: 'audit',
                stream: process.stdout
            })
        }));
    }
    if (!skip_app_version_routes)
        ['/', '/version', '/api', '/api/version'].map(route_path => app.get(route_path, (req, res, next) => {
            res.json(Object.assign({ version: package_.version }, version_routes_kwargs));
            return next();
        }));
    return app;
};
const restifyStartApp = (skip_start_app, app, listen_port, onServerStart, logger, callback) => skip_start_app ? callback != null && callback(null, app)
    : app.listen(listen_port, () => {
        logger.info('%s listening at %s', app.name, app.url);
        if (onServerStart != null)
            return onServerStart(app.url, app, callback == null ? () => { } : callback);
        else if (callback != null)
            return callback(void 0, app);
        return app;
    });
const handleErr = (callback) => (e) => {
    if (callback == null)
        throw e;
    return callback(e);
};
exports.routesMerger = (options) => {
    ['routes', 'server_type', 'package_', 'app_name'].forEach(opt => options[opt] == null && handleErr(options.callback)(TypeError(`\`options.${opt}\` required.`)));
    if (options.skip_start_app == null)
        options.skip_start_app = false;
    if (options.skip_app_version_routes == null)
        options.skip_app_version_routes = false;
    if (options.skip_app_logging == null)
        options.skip_app_logging = false;
    if (options.logger == null)
        options.logger = Logger.createLogger({ name: 'routes-merger' });
    if (options.version_routes_kwargs == null)
        options.version_routes_kwargs = {};
    if (options.app != null) {
    }
    else if (options.server_type === 'restify') {
        options.app = restifyInitApp(options.app == null ? restify.createServer(Object.assign({ name: options.app_name }, options.createServerArgs || {}))
            : options.app, options.with_app, options.skip_app_logging, options.skip_app_version_routes, options.package_, options.version_routes_kwargs);
    }
    else
        throw Error(`NotImplemented: ${options.server_type}; TODO`);
    const routes = new Set();
    for (const [dir, program] of options.routes)
        if (['routes', 'route', 'admin'].some(r => dir.indexOf(r) > -1)) {
            Object
                .keys(program)
                .forEach((route) => typeof program[route] === 'function'
                && program[route](options.app, `${options.root}/${path_1.dirname(dir)}`));
            routes.add(dir);
        }
    options.logger.info(`${options.server_type} registered routes:\t`, Array.from(routes), ';');
    if (options.server_type === 'restify')
        return restifyStartApp(options.skip_start_app, options.app, options.listen_port, options.onServerStart, options.logger, options.callback);
    if (typeof options.callback === 'undefined')
        return options.app;
    return options.callback(void 0, options.app);
};
