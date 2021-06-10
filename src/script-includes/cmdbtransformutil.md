---
title: "CMDBTransformUtil"
id: "cmdbtransformutil"
---

API Name: global.CMDBTransformUtil

```js
var CMDBTransformUtil = Class.create();
CMDBTransformUtil.prototype = {
	initialize: function() {
		this.json = new JSON();
		this.dataSource = 'ImportSet';
		this.transformEntryTable = 'sys_transform_entry';
		this.cmdbTransformStatsTable = 'cmdb_import_set_run';
		this.CmdbAPI = SNC.IdentificationEngineScriptableApi;
		this.CmdbUtil = SNC.CMDBUtil;
		this.outputPayload = '';
		this.outputRecordSysId = '';
		this.error = '';
		this.transformResult = 'e';
	},

	// Identify and Reconcile given source record and transform map
	identifyAndReconcile: function(source, map, log) {
		var inputPayload = this.buildInputPayload(source, map, log);
		this.identifyAndReconcileFromPayload(inputPayload, map, log);
	},

	// Identify and Reconcile given an input payload and transform map
	identifyAndReconcileFromPayload: function(inputPayload, map, log) {
		if (!this.hasError() && inputPayload.items.length !== 0) {
			this.outputPayload = this.CmdbAPI.createOrUpdateCI(this.dataSource, this.json.encode(inputPayload));
			log.info("Identification and Reconciliation Result: " + this.outputPayload);

			if (!gs.nil(this.outputPayload)) {
				var output = this.json.decode(this.outputPayload);
				var item = output.items[0];
				if (item && item.sysId && item.sysId !== 'Unknown') {
					this.outputRecordSysId = item.sysId;

					if (item.operation == 'INSERT')
						this.transformResult = 'i';
					else if (item.operation == 'UPDATE')
						this.transformResult = 'u';
					else if (item.operation == 'NO_CHANGE')
						this.transformResult = 'g';
				}
				else
					this.error = 'createOrUpdateCI failed.';
			}
		}
		this._updateTransformStats(map, log);
	},

	// Builds inputPayload for given source record and transform map
	buildInputPayload: function(source, map, log) {
		var inputPayload = {};
		inputPayload.items = [];
		var item = {};
		var values = this.getTransformValues(source, map, log);
		var recordClassName = this.getClassNameFromMappedValues(values);
		item.className = recordClassName === null ? map.target_table : recordClassName;
		//remove sys_class_name from the list of attributes in the payload
		if (recordClassName !== null) {
			delete values['sys_class_name'];
		}

		var isEmpty = !Object.keys(values).length;
		if (!this.hasError() && !isEmpty) {
			item.values = values;
			inputPayload.items.push(item);
		}

		return inputPayload;
	},

	// Get values that need to be transformed for given source record
	getTransformValues: function(source, map, log) {
		var values = {};
		var td = GlideTableDescriptor.get(map.target_table);
		var entryGr = new GlideRecord(this.transformEntryTable);
		entryGr.addQuery('map', map.sys_id);
		entryGr.addQuery('source_table', map.source_table);
		entryGr.addQuery('target_table', map.target_table);
		entryGr.query();

		while(entryGr.next()) {
			var targetField = entryGr.getValue('target_field');
			var targetValue = "";

			if (entryGr.getValue('use_source_script') == true) {
				var evaluator = new GlideScopedEvaluator();

				evaluator.putVariable('answer', null);
				evaluator.putVariable('source', source);
				evaluator.putVariable('error', false);
				evaluator.putVariable('error_message', '');

				evaluator.evaluateScript(entryGr, 'source_script');

				if (evaluator.getVariable('error') == true) {
					this.error = 'Error executing source script to populate target field ' + targetField;
					var errMsg = evaluator.getVariable('error_message');
					if (!gs.nil(errMsg))
						this.error += ' : ' + errMsg;
					log.error(this.error);
					values = {};
					return values;
				}
				targetValue = "" + evaluator.getVariable('answer');
			} else {
				var sourceField = entryGr.getValue('source_field');
				targetValue = source.getValue(sourceField);
				if (targetValue == null)
					targetValue = "";
			}

			var ed = td.getElementDescriptor(targetField);
			if (!gs.nil(targetValue) && ed.isReference()) {
				var result = this.CmdbUtil.resolveReferenceField(entryGr, targetValue, this.dataSource, false);
				var retObj = JSON.parse(result);

				if (retObj && !gs.nil(retObj.error)) {
					if (retObj.error == "reject") {
						log.info("Skipping record as the value for reference field " + targetField + " could not be resolved.");
						this.transformResult = 's';
					}
					else {
						log.error(retObj.error);
						this.error = retObj.error;
					}

					values = {};
					return values;
				}
				else if (retObj && !gs.nil(retObj.reference_field_value))
					values[targetField] = retObj.reference_field_value;

			} else
				values[targetField] = targetValue;
		}

		return values;
	},

	getOutputPayload: function() {
		return this.outputPayload;
	},

	hasError: function() {
		return !gs.nil(this.error);
	},

	getError: function() {
		return this.error;
	},

	getOutputRecordSysId: function() {
		return this.outputRecordSysId;
	},

	setDataSource: function(ds) {
		this.dataSource = ds;
	},

	// log current stats about the import set run
	logTransformStats: function(log, statGr) {
		if (!statGr) {
			if (typeof import_set !== "undefined" && import_set !== null) {
				statGr = new GlideRecord(this.cmdbTransformStatsTable);
				statGr.addQuery('set', import_set.sys_id);
				statGr.query();
				if (!statGr.next())
					return;
			}
			else
				return;
		}

		var total = statGr.getValue('total');
		var inserts = statGr.getValue('inserts');
		var updates = statGr.getValue('updates');
		var ignored = statGr.getValue('ignored');
		var skipped = statGr.getValue('skipped');
		var errors = statGr.getValue('errors');

		log.info("CMDBTransformUtil Transform stats:total " + total + ", inserts " + inserts
				 + ", updates " + updates + ", ignored " + ignored + ", skipped " + skipped 
				 + ", errors " + errors);
	},

	_updateTransformStats: function(map, log) {
		if (typeof import_set !== "undefined" && import_set !== null) {
			var statGr = new GlideRecord(this.cmdbTransformStatsTable);
			statGr.addQuery('set', import_set.sys_id);
			statGr.query();

			if (statGr.next()) {
				var total = statGr.getValue('total');
				statGr.setValue('total' , ++total);

				var incrField = 'errors';
				switch (this.transformResult) {
					case 'i': incrField = 'inserts'; break;
					case 'u': incrField = 'updates'; break;
					case 'g': incrField = 'ignored'; break;
					case 's': incrField = 'skipped'; break;
				}

				var statValue = statGr.getValue(incrField);
				statGr.setValue(incrField , ++statValue);
				statGr.update();
			} else {
				statGr.initialize();
				statGr.setValue('set', import_set.sys_id);
				statGr.setValue('sys_transform_map', map.sys_id);
				statGr.setValue('total' , '1');
				statGr.setValue('inserts', this.transformResult == 'i' ? '1': '0');
				statGr.setValue('updates', this.transformResult == 'u' ? '1': '0');
				statGr.setValue('ignored', this.transformResult == 'g' ? '1': '0');
				statGr.setValue('skipped', this.transformResult == 's' ? '1': '0');
				statGr.setValue('errors',  this.transformResult == 'e' ? '1': '0');
				statGr.insert();
			}
		}
	},

	getClassNameFromMappedValues : function(values) {
	    if (values.hasOwnProperty('sys_class_name')) {
	    	return values['sys_class_name'];
	    }
		return null;
	},

	type: 'CMDBTransformUtil'
};
```