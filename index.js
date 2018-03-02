var loaderUtils = require('loader-utils');
var fs = require('fs');
var path = require('path');
var nunjucks = require('nunjucks');

var NunjucksLoader = nunjucks.Loader.extend({
	// Based off of the Nunjucks 'FileSystemLoader'

	init(searchPaths, sourceFoundCallback) {
		this.sourceFoundCallback = sourceFoundCallback;
		if (searchPaths) {
			searchPaths = Array.isArray(searchPaths) ? searchPaths : [searchPaths];
			// For windows, convert to forward slashes
			this.searchPaths = searchPaths.map(path.normalize);
		} else {
			this.searchPaths = ['.'];
		}
	},

	getSource(name) {
		var fullpath = null;
		var paths = this.searchPaths;

		for (var i = 0; i < paths.length; i++) {
			var basePath = path.resolve(paths[i]);
			var p = path.resolve(paths[i], name);

			// Only allow the current directory and anything
			// underneath it to be searched
			if (p.indexOf(basePath) === 0 && fs.existsSync(p)) {
				fullpath = p;
				break;
			}
		}

		if (!fullpath) {
			throw new Error(`Source ${name} not found in any path: ${JSON.stringify(paths)}`);
		}

		this.sourceFoundCallback(fullpath);

		return {
			src: fs.readFileSync(fullpath, 'utf-8'),
			path: fullpath,
			noCache: this.noCache
		};
	}
});

module.exports = function(content) {
	this.cacheable();

	const options = Object.assign(
		{},
		loaderUtils.getOptions(this)
	);

	const callback = this.async();

	const loader = new NunjucksLoader(
		options.searchPaths,
		path => this.addDependency(path)
	);

	const nunjEnv = new nunjucks.Environment(loader);
	nunjucks.configure(null, { watch: false });

	const template = nunjucks.compile(content, nunjEnv);
	const html = template.render(this.rootContext);

	callback(null, `module.exports = ${JSON.stringify(html)}`);
};
