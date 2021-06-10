---
title: "PwdResetStageBaseBL"
id: "pwdresetstagebasebl"
---

API Name: global.PwdResetStageBaseBL

```js
var PwdResetStageBaseBL = Class.create();
PwdResetStageBaseBL.prototype = {
	
	STAGE: '',
	
	trackingMgr : new SNC.PwdTrackingManager(),
		
	/** 
		Check that a given request exists in the password reset request table. Logs a failure if it does not exist
		@param {String} requestId - sys id
		@return {boolean} whether it exists or not
	*/
	requestExists: function(requestId) {
		if (this.trackingMgr.requestExists(requestId)) 
			return true;
		else {
			var reqFailureMsg = "Request does not exist (request_id = " + requestId + ")";
			this.logError(reqFailureMsg, requestId);
			return false;
		}
	},
	
	// refTable and refSysId are optional
	logInfo: function(message, requestId, refTable, refSysId) {
		this.trackingMgr.createActivity(PwdConstants.TYPE_INFO, this.STAGE, message, requestId, refTable, refSysId);
	},
	
	logWarning: function(message, requestId, refTable, refSysId) {
		this.trackingMgr.createActivity(PwdConstants.TYPE_WARNING, this.STAGE, message, requestId, refTable, refSysId);
	},
	
	logError: function(message, requestId, refTable, refSysId) {
		this.trackingMgr.createActivity(PwdConstants.TYPE_ERROR, this.STAGE, message, requestId, refTable, refSysId);
	},
	
    type: 'PwdResetStageBaseBL'
};
```