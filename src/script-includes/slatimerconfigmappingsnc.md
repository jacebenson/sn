---
title: "SLATimerConfigMappingSNC"
id: "slatimerconfigmappingsnc"
---

API Name: sn_slm_timer.SLATimerConfigMappingSNC

```js
var SLATimerConfigMappingSNC = Class.create();

SLATimerConfigMappingSNC.LOG_PROP = SLATimerSNC.LOG_PROP;
SLATimerConfigMappingSNC.SLA_TIMER_SOURCE = 2;

SLATimerConfigMappingSNC.prototype = {
	initialize: function(_gr, _gs) {
		this._log = new global.GSLog(SLATimerConfigMappingSNC.LOG_PROP, this.type);

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[initialize] type: ' + this.type);

		this._gr = _gr;
		this._gs = _gs || gs;
	},

	isDuplicate: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return false;

		var mappingGr = new GlideRecord('sla_timer_config_mapping');
		mappingGr.addQuery('config', this._gr.getValue('config'));
		mappingGr.addQuery('table', this._gr.getValue('table'));
		mappingGr.addQuery('sla', this._gr.getValue('sla')).addOrCondition('order', this._gr.getValue('order'));
		mappingGr.addNotNullQuery('config');
		mappingGr.addNotNullQuery('table');
		mappingGr.addNotNullQuery('sla');
		mappingGr.addNotNullQuery('order');
		mappingGr.query();

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[isDuplicate] encodedQuery: " + mappingGr.getEncodedQuery());

		var isDuplicate = false;
		while (mappingGr.next()) {
			if (mappingGr.getUniqueValue() !== this._gr.getUniqueValue())
				isDuplicate = true;
		}

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[isDuplicate] isDuplicate: " + isDuplicate);

		return isDuplicate;
	},

	getNextOrder: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return -1;

		return this._getMaxOrder() + 10;
	},

	_getMaxOrder: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return -1;

		var mappingGa = new GlideAggregate('sla_timer_config_mapping');
		mappingGa.addQuery('config', this._gr.getValue('config'));
		mappingGa.addQuery('table', this._gr.getValue('table'));
		mappingGa.addNotNullQuery('order');
		mappingGa.orderByAggregate('MAX', 'order');
		mappingGa.addAggregate('MAX', 'order');
		mappingGa.query();

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_getMaxOrder] encodedQuery: " + mappingGa.getEncodedQuery());

		var order = 0;
		if (mappingGa.next())
			order = parseInt(mappingGa.getAggregate('MAX', 'order'));

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_getMaxOrder] order: " + order);

		return order;
	},

	limitByTable: function(table) {
		table = table || current.table || '';

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[limitByTable] table: " + table);

		if (!table)
			return '';

		var refQual = 'collection=' + table;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[limitByTable] refQual: " + refQual);

		return refQual;
	},

	limitByMapping: function() {
		var refQual = 'sla_timer_source=' + SLATimerConfigMappingSNC.SLA_TIMER_SOURCE;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[limitByMapping] refQual: " + refQual);

		return refQual;
	},

	type: 'SLATimerConfigMappingSNC'
};
```