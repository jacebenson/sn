---
title: "SLAAsyncUtilsSNC"
id: "slaasyncutilssnc"
---

API Name: global.SLAAsyncUtilsSNC

```js
var SLAAsyncUtilsSNC = Class.create();
SLAAsyncUtilsSNC.prototype = {
	SLA_ENGINE_ASYNC: 'com.snc.sla.engine.async',
	SLA_ASYNC_QUEUE_MODULE_ID: 'd9ddc78773012300491d235f04f6a798',
	SLA_FORCE_ASYNC: 'SLA_FORCE_ASYNC',
	SLA_PROCESSING_ASYNC: 'SLA_PROCESSING_ASYNC',

	initialize: function() {
	},

	isAsyncProcessingActive: function() {
		return this.isSLAEngineAsync() || this.isSLAAsyncOverride();
	},

	isSLAEngineAsync: function() {
		return gs.getProperty(this.SLA_ENGINE_ASYNC, 'true') === 'true';
	},

	isSLAAsyncOverride: function() {
		return ("" + GlideController.getGlobal(this.SLA_FORCE_ASYNC)) === "true";
	},

	enableAsyncOverride: function() {
		GlideController.putGlobal(this.SLA_FORCE_ASYNC, true);
	},

	disableAsyncOverride: function() {
		GlideController.removeGlobal(this.SLA_FORCE_ASYNC);
	},

	isSLAAsyncProcessing: function() {
		return ("" + GlideController.getGlobal(this.SLA_PROCESSING_ASYNC)) === "true";
	},

	setSLAAsyncProcessing: function(trueOrFalse) {
		if (("" + trueOrFalse) === "true")
			GlideController.putGlobal(this.SLA_PROCESSING_ASYNC, true);
		else
			GlideController.removeGlobal(this.SLA_PROCESSING_ASYNC);
	},

	activateModule: function() {
		this._setModuleActiveFlag(true);
	},

	deactivateModule: function() {
		this._setModuleActiveFlag(false);
	},

	_setModuleActiveFlag: function(trueOrFalse) {
		var moduleGr = new GlideRecord("sys_app_module");
		if (!moduleGr.get(this.SLA_ASYNC_QUEUE_MODULE_ID))
			return;

		moduleGr.active = trueOrFalse;
		moduleGr.update();
		SncAppsUtil.flushNavigator();
	},

	/***************************************/
	/* Deprecated properties and functions */
	/***************************************/
	SLA_ASYNC_QUEUE_DEACTIVATING: 'com.snc.sla.async.deactivating',
	SLA_ASYNC_DELEGATOR_JOB_PRIORITY: 100,
	SLA_ASYNC_DELEGATOR_REPEAT: 5,

	activate: function() {
		return;
	},

	setDeactivating: function(trueOrFalse) {
		return;
	},

	isDeactivating: function() {
		return false;
	},
	
	completeDeactivation: function(sysTriggerGr) {
		return;
	},

	deleteDeactivating: function() {
		return;
	},
	/***************************************/

	type: 'SLAAsyncUtilsSNC'
};
```