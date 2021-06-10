---
title: "PWDWFProcessorBase"
id: "pwdwfprocessorbase"
---

API Name: global.PWDWFProcessorBase

```js
var PWDWFProcessorBase = Class.create();
PWDWFProcessorBase.prototype = Object.extendsObject(PwdAjaxRequestProcessor, {
    
	CTX_FIELDS : [
		'workflow',
		'table',
		'id',
		'state',
		'started',
		'ended',
		'due',
		'stage',
		'result',
		'scratchpad',
		'active',
		'active_count',
		'active_index',
		'after_business_rules',
		'sys_id',
		'started_by',
		'auto_start',
		'sys_domain',
		'schedule',
		'timezone',
	],
	
	HISTORY_FIELDS : [
		'context',
		'activity',
		'is_parent',
		'started',
		'ended',
		'due',
		'activity_result',
		'fault_description',
		'output',
		'activity_index',
		'rolled_back_by',
	],
	
	ACTIVITY_FIELDS : [
		'name',
		'activity_definition',
		'stage',
		'x',
		'y',
		'height',
		'width',
		'vars',
		'timeout',
	],
	
	COMMON_FIELDS : [
		'parent',
		'workflow_version',
		'state',
		'sys_updated_by',
		'sys_updated_on',
		'sys_created_by',
		'sys_created_on',
		'sys_domain',
		'sys_mod_count',
		'sys_id'
	],
	
	createContextItem: function (ctxGr) {
		this._createItemFromRecord('context', ctxGr, this.CTX_FIELDS.concat(this.COMMON_FIELDS));
	},
	
	createHistoryItems: function (historyGr) {
		while (historyGr.next()) {
			this._createItemFromRecord('history', historyGr, this.HISTORY_FIELDS.concat(this.COMMON_FIELDS));
			var activityGr = new GlideRecord('wf_activity');
			activityGr.get(historyGr.getValue('activity'));
			this.createActivityItem(activityGr);
		}
	},
	
	createActivityItem: function (activityGr) {
		this._createItemFromRecord('activity', activityGr, this.ACTIVITY_FIELDS.concat(this.COMMON_FIELDS));
	},
	
	_createItemFromRecord: function(name, gr, fields) {
		var item = this.newItem(name);
		
		for (var fieldName in fields)
			item.setAttribute(fieldName, gr.getValue(fieldName));
	},

    type: 'PWDWFProcessorBase'
});
```