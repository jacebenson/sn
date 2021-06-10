---
title: "PwdAjaxUserUnlockProcessor"
id: "pwdajaxuserunlockprocessor"
---

API Name: global.PwdAjaxUserUnlockProcessor

```js
/*
 * Class is a Ajax processor which handles password reset workflow related functionality.
 */
var PwdAjaxUserUnlockProcessor = Class.create();
PwdAjaxUserUnlockProcessor.prototype = Object.extendsObject(PWDWFProcessorBase, {
	
	BL : new PwdUserUnlockUtil(),
	
	// This function makes this AJAX public. By default, all AJAX server side is private.
	isPublic: function() {
		return true;
	},
	
	// ---------------------------------------------------------------------------------
	// ------------- Handle the retrieval of the account lock status : -----------------
	// ---------------------------------------------------------------------------------
	
	
	// This AJAX function returns the wf status based upon the wf_context table.
	/* eslint-disable consistent-return */ 
	pollLockStateFromRequest: function() {
		if(!this._validateSecurity())
			return;
		
		var requestId = this.getParameter("sysparam_request_id");
		
		return this.BL.getLockStateFromRequest(requestId);
	},
	/* eslint-enable consistent-return */
	
	
	// This AJAX function starts a workflow that checks the user's lock state.
	// In case of an exception, will send an error message back to client.
	initiateGetLockStateWF: function() {
		if(!this._validateSecurity())
			return;
	
		var requestId = this.getParameter("sysparam_request_id");
		var userId = this.getParameter("sysparam_sys_user_id");
		var LOG_ID = "[PwdAjaxUserUnlockProcessor:initiateGetLockStateWF] ";
		
		var result = this.BL.startGetLockStateWorkflow(requestId, userId);
		
		this._processResult(result, requestId, LOG_ID, this.BL.GET_ACCOUNT_LOCK_STATE_MASTER_WORKFLOW);
	},
		
	// This AJAX function returns the wf status based upon the wf_context table.
	checkGetLockStateWFState: function() {
		// check the security before anything else.
		if(!this._validateSecurity())
			return;
		
		var ctxId = this.getParameter('sysparam_wf_context_sys_id');
		
		var flowData = PWDWorkflowHelper.getWorkflowData(ctxId, false);
		
		var response = this.newItem("response");
		response.setAttribute("state", flowData.state);
		response.setAttribute("result", flowData.result);
	},
	
	// ---------------------------------------------------------------------------------
	// ------------------------ Handle the account unlocking: --------------------------
	// ---------------------------------------------------------------------------------
	
	// This AJAX function starts a workflow that unlocks the account:
	initiateUnlockWF: function() {
		if(!this._validateSecurity())
			return;
		
		var LOG_ID = "[PwdAjaxUserUnlockProcessor:initiateGetLockStateWF] ";
		var requestId = this.getParameter("sysparam_request_id");
		var userId = this.getParameter("sysparam_sys_user_id");
		
		var result = this.BL.startUnlcokWorkflow(requestId, userId);
		
		this._processResult(result, requestId, LOG_ID, this.BL.UNLOCK_ACCOUNT_MASTER_WORKFLOW);
	},
	
	
	// This AJAX function returns the wf status based upon the wf_context table:
	checkUnlockWFState: function() {
		// check the security before anything else.
		if(!this._validateSecurity())
			return;
		
		var ctxId = this.getParameter("sysparam_wf_context_sys_id");
		
		var flowData = PWDWorkflowHelper.getWorkflowData(ctxId);
		
		var response = this.newItem("response");
		response.setAttribute("state", flowData.state);
		response.setAttribute("result", flowData.result);
		
		// If workflow is finished, pass additional workflow results:
		if (flowData.state.match(/finished/i)) {
			this.createContextItem(flowData.contextGr);
			this.createHistoryItems(flowData.historyGr);
			this._setResponseMessage("success", gs.getMessage("The request has been successfully completed") ,ctxId);
		}
	},
	
	_processResult: function(result, requestId, logId, wfName) {
		var errorMsg;
		
		if (result == this.BL.STATUS_UNVERIFIED) {
			errorMsg = gs.getMessage("{0} Could not verify request: {1}", [logId, requestId]);
			this._setResponseMessage("failure", errorMsg, requestId);
		}
		else if (result == this.BL.STATUS_FAILURE) {
			errorMsg = gs.getMessage("{0} Failed to start workflow: {1}", [logId, wfName]);
			this._setResponseMessage("failure", errorMsg, requestId);
		}
		else {
			this._setResponseMessage("success", "The request has been successfully completed", result /* ctxId*/);
		}
	},
	
	type:PwdAjaxUserUnlockProcessor
});
```