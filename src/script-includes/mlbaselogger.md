---
title: "MLBaseLogger"
id: "mlbaselogger"
---

API Name: global.MLBaseLogger

```js
var MLBaseLogger = Class.create();
MLBaseLogger.DEBUG = 0;
MLBaseLogger.INFO = 1;
MLBaseLogger.WARNING = 2;
MLBaseLogger.ERROR = 3;

MLBaseLogger.getLogger = function(source) {
	var col = new MLBaseLogger(source);
	return col;
};

MLBaseLogger.prototype = {
    initialize: function(source) {
		this.source = MLBaseConstants.DEFAULT_LOGGER_SOURCE;
		this.level = gs.getProperty('com.snc.ml_base.log.verbosity', MLBaseConstants.DEFAULT_LOG_LEVEL);
		if(source)
			this.source = source;
    },
	
	debug: function(msg) {
		if(this.level <= MLBaseLogger.DEBUG)
			gs.info(this._getFormattedString(msg));
	},

	info: function(msg) {
		if(this.level <= MLBaseLogger.INFO)
			gs.info(this._getFormattedString(msg));
	},
	
	warn: function(msg) {
		if(this.level <= MLBaseLogger.WARNING)
			gs.warn(this._getFormattedString(msg));
	},
	
	error: function(msg) {
		if(this.level <= MLBaseLogger.ERROR)
			gs.error(this._getFormattedString(msg));
	},
	
	_getFormattedString: function (msg) {
		return this.source + " :: " + msg;
		
	},

    type: 'MLBaseLogger'
};
```