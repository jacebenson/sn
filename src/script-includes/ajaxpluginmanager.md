---
title: "AjaxPluginManager"
id: "ajaxpluginmanager"
---

API Name: global.AjaxPluginManager

```js
var AjaxPluginManager = Class.create();

AjaxPluginManager.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	process: function() {
		if (this._getName() == 'getRollbackContextId')
			return this._getRollbackContextId();
		else if (this._getName() == 'getRollbackRunId')
			return this._getRollbackRunId();
		else if (this._getName() == 'getRollbackDenialReason')
			return this._getRollbackDenialReason();
    },
	_getRollbackContextId: function() {
		var rctxid = GlidePluginManager.getRollbackContextId(this._getPluginId());
		gs.info('rollbackContextId:' + rctxid);
		return rctxid;
	},
	_getRollbackRunId: function() {
		var rrid = GlidePluginManager.getRollbackRunId(this._getRCId());
		gs.info('rrid:' + rrid);
		return rrid;
	},
	_getRollbackDenialReason: function() {
		var denialReason = GlidePluginManager.getRollbackDenialReason(this._getPluginId());
		gs.info('Rollback denialReason:' + denialReason);
		return denialReason;
	},
	_getName: function() {
		return this.getParameter('sysparam_ajax_function');
	},
	_getPluginId: function() {
		return this.getParameter('pluginid');
	},
	_getRCId: function() {
		return this.getParameter('rollback_context_id');
	},
    type: 'AjaxPluginManager'
});
```