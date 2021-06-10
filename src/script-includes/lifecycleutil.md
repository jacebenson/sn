---
title: "LifeCycleUtil"
id: "lifecycleutil"
---

API Name: global.LifeCycleUtil

```js
var LifeCycleUtil = Class.create();
LifeCycleUtil.prototype = {
    initialize: function() {
    },
	
	filterLifeCycleStage: function() {
		var filter = 'sys_idIN';
		var ids = [];
		var currentTable = current.getTableName();
		var tables = this._getParents(currentTable);
		tables.push(currentTable);

		var gr = new GlideRecord('life_cycle_control');
		gr.addEncodedQuery('table.nameIN' + tables.join());
		gr.query();
		while (gr.next()) {
			if (ids.indexOf(gr.life_cycle_stage.sys_id) < 0) {
				ids.push(gr.life_cycle_stage.sys_id);
			}
		}
		filter += ids.join();
		return filter;
	},

	filterLifeCycleStageStatus: function() {
		var filter = 'sys_idIN';
		var ids = [];
		var currentTable = current.getTableName();
		var tables = this._getParents(currentTable);
		tables.push(currentTable);
		var stage = current.life_cycle_stage.sys_id;
		var gr = new GlideRecord('life_cycle_control');
		gr.addEncodedQuery('table.nameIN' + tables.join() + '^life_cycle_stage.sys_id=' + stage);
		gr.query();
		while (gr.next()) {
			if (ids.indexOf(gr.life_cycle_stage_status.sys_id) < 0) {
				ids.push(gr.life_cycle_stage_status.sys_id);
			}
		}
		filter += ids.join();
		return filter;
	},
	
	validate: function(previousRef, currentRef) {
		if (!currentRef) {
			return;
		}

		// Insert
		if (!previousRef || (!previousRef.life_cycle_stage && !previousRef.life_cycle_stage_status)) {
			if (currentRef.life_cycle_stage_status && !currentRef.life_cycle_stage) { // Only status
				gs.log('Abort insert! Life cycle stage is required but only stage status is provided');
				currentRef.setAbortAction(true);
				return;
			} else if (currentRef.life_cycle_stage && !currentRef.life_cycle_stage_status) { // Only stage
				currentRef.setValue('life_cycle_stage_status', 'NULL'); 
				return;
			}

			// Both provided
			if (!this._validateCombination(currentRef)) {
				gs.log('Abort insert! Life cycle stage and stage status value combination is invalid');
				currentRef.setAbortAction(true);
			}
			return;
		}

		// Update
		if (previousRef.life_cycle_stage == currentRef.life_cycle_stage) { // Stage did not change
			if (!this._validateCombination(currentRef)) {
				gs.log('Abort update! Life cycle stage value did not change. Stage status value changed. Invalid stage and stage status value combination.');
				currentRef.setAbortAction(true);
			}
		} else { // Stage changed
			if (previousRef.life_cycle_stage_status == currentRef.life_cycle_stage_status) { // Status same
				currentRef.setValue('life_cycle_stage_status', 'NULL');
			} else { // Status changed
				if (!this._validateCombination(currentRef)) {
					gs.log('Abort update! Life cycle stage and stage status both changed. The value combination is invalid');
					currentRef.setAbortAction(true);
				}
			}
		}
	},
	
	getParamAsString: function(paramName) {
		if (request.queryParams.hasOwnProperty(paramName))
			return request.queryParams[paramName] + '';
		return '';
	},
	
	_getParents: function(tableName) {
		var manager = GlideDBObjectManager.get();
		var parents = [];
		var parent = manager.getBase(tableName);
		var lastParent = '';

		while (parent !== lastParent) {
			parents.push(parent);
			lastParent = parent;
			parent = manager.getBase(lastParent);
		}

		return parents;
	},

	_validateCombination: function(currentRef) {
		if (!currentRef.life_cycle_stage || !currentRef.life_cycle_stage_status) {
			return false;
		}
		var stage = currentRef.life_cycle_stage.sys_id;
		var currentTable = currentRef.getTableName();
		var tables = this._getParents(currentTable);
		tables.push(currentTable);

		var isValid = false;
		var gr = new GlideRecord('life_cycle_control');
		gr.addEncodedQuery('table.nameIN' + tables.join() + '^life_cycle_stage.sys_id=' + stage);
		gr.query();
		while (gr.next()) {
			if (currentRef.life_cycle_stage_status.sys_id == gr.life_cycle_stage_status.sys_id) {
				isValid = true;
				break;
			}
		}
		return isValid;
	},

    type: 'LifeCycleUtil'
};
```