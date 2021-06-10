---
title: "AjaxAppManager"
id: "ajaxappmanager"
---

API Name: global.AjaxAppManager

```js
var AjaxAppManager = Class.create();


AjaxAppManager.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

	process: function() {
	  if (this._getName() == 'getRollbackContextId')
			return this._getRollbackContextId();
		else if (this._getName() == 'getRollbackRunId')
			return this._getRollbackRunId();
		else if (this._getName() == 'getRollbackDenialReason')
			return this._getRollbackDenialReason();
    },
	_getRollbackContextId: function() {
		gs.info('AppId parameter is:' + this._getAppId());
		gs.info('Version parameter is:' + this._getVersion());
		var rctxid =  sn_app_api.AppStoreAPI.getRollbackContextId(this._getAppId() ,this._getVersion());
		gs.info('rollbackContextId:' + rctxid);
		return rctxid;
	},
	isRollbackEligible: function(glideRecord) {
		gs.info('AppId parameter is:' + glideRecord.name);
		gs.info('Version parameter is:' + glideRecord.version);
		var rctxid =  sn_app_api.AppStoreAPI.isRollbackEligible(glideRecord.name ,glideRecord.version);
		gs.info('rollbackContextId:' + rctxid);
		return rctxid;
	},
	_getRollbackRunId: function() {
		var rrid = sn_app_api.AppStoreAPI.getRollbackRunId(this._getRCId());
		gs.info('rrid:' + rrid);
		return rrid;
	},
	_getRollbackDenialReason: function() {
		var denialReason = sn_app_api.AppStoreAPI.getRollbackDenialReason(this._getAppId(), this._getVersion());
		gs.info('App Rollback Denial Reason >> ' + denialReason);
		return denialReason;
	},
	_getName: function() {
		return this.getParameter('sysparam_ajax_function');
	},
	_getAppId: function() {
		return this.getParameter('appid');
	},
	_getVersion: function() {
		return this.getParameter('version');
	},
	_getRCId: function() {
		return this.getParameter('rollback_context_id');
	},
    type: 'AjaxAppManager'
});
```