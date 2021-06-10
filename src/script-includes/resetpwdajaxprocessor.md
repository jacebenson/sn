---
title: "ResetPwdAjaxProcessor"
id: "resetpwdajaxprocessor"
---

API Name: global.ResetPwdAjaxProcessor

```js
var ResetPwdAjaxProcessor = Class.create();

ResetPwdAjaxProcessor.prototype = Object.extendsObject(PwdAjaxRequestProcessor, {
	TYPE_INFO: "Info",
	TYPE_WARNING: "Warning",
	TYPE_ERROR: "Error",
	
	STAGE_IDENTIFICATION: "Identification",
	STAGE_VERIFICATION: "Verification",
	STAGE_RESET: "Reset",
	VERIFIED : 2,
	
	wfTimeOut : 300000,
	
	// Password Reset Process - Default Self Service
    sysparm_process_id : "c6b0c20667100200a5a0f3b457415ad5",
	
	/**
	* This function makes this AJAX public. By default, all AJAX server side is private.
	*/
	isPublic: function() {
		return true;
	},

	resetPwdAjaxProcess: function() {
		// retrieve parameters from client call
		var sysparm_user_id = request.getParameter("sysparm_user_id");
		var sysparm_email = request.getParameter("sysparm_email");
		
		// verify identity
		var idenProcessorId = this._getIdentificationProcessorId(this.sysparm_process_id);
		var idenObj = [{user_input: sysparm_user_id, processor_id: idenProcessorId}];
		var identifyBL = new PwdIdentifyStageBL();
		var identity_verify_res = identifyBL.verifyIdentity(this.sysparm_process_id, idenObj, null, request);
		
		if(identity_verify_res == "ok"){        // could be "user does not exists", "block", "ok"
			// verify email
		    var email_verify_res = this._verifyEmail(sysparm_user_id, sysparm_email);
			
			// reset password workflow
			if(email_verify_res == "ok"){       // could be "external_error", "block", "not_match_error", "ok"
				var pwdWFRequestProcessor = new PwdWFRequestProcessor();
				
				var startTime = new Date().getTime();
				gs.getSession().putProperty('startTime', startTime);
				
			    var reset_res = pwdWFRequestProcessor.startWorkflow(gs.getSession().getProperty('sysparm_request_id'), null);
				
				if(reset_res.status.match(/failure/i)){
					return "wf_error";
				}
				else{
					gs.getSession().putProperty('ctxId', reset_res.value);
					return "wf_started";
				}
			}
			else return email_verify_res; // "external_error", "block", "not_match_error"
		}
		else if(identity_verify_res == "block"){
			return "block";
		} else if(identity_verify_res == "ldap error") {
			//alert and exit if ldap account
			var trackingMgr = new SNC.PwdTrackingManager();
			trackingMgr.createActivity(this.TYPE_ERROR, this.STAGE_IDENTIFICATION, "User is sourced from external. Cannot reset network password", gs.getSession().getProperty('sysparm_request_id'));
			return "external_error";
		}
		else{
			return "block" // "not_match_error"; Quick fix for security bug PRB668168
		}
	},
	
	_verifyEmail: function(sysparm_user_id, sysparm_email){
		var msg = "";
		var trackingMgr = new SNC.PwdTrackingManager();
		
		// Retrieve request by request_id created in pwdVerifyIdentity process
		var sysparm_request_id = gs.getSession().getProperty('sysparm_request_id');
       
		// retrieve user record
		var usr = new GlideRecord('sys_user');
		usr.addQuery('active', 'true');
		usr.addQuery('user_name', sysparm_user_id);
		usr.queryNoDomain();
		
		if(usr.next()){
			// verification fails
			if (usr.email.toLowerCase() != sysparm_email.toLowerCase()){
				var retry = trackingMgr.updateRequestRetry(sysparm_request_id);
				if (retry < 0) {
					trackingMgr.createActivity(this.TYPE_WARNING, this.STAGE_VERIFICATION, "Maximum retries reached, blocking user", sysparm_request_id);
					return "block";
				} else {
					trackingMgr.createActivity(this.TYPE_WARNING, this.STAGE_VERIFICATION, "Attempt " + retry + " failed, allowing retry", sysparm_request_id);
					return "block" // "not_match_error"; Quick fix for security bug PRB668168
				}
			}
			// verification succeed
			else{
				trackingMgr.createActivity(this.TYPE_INFO, this.STAGE_VERIFICATION, "User verified successfully", sysparm_request_id);
				trackingMgr.updateRequestStatus(sysparm_request_id, this.VERIFIED);
				return "ok";
			}
		}
	},
	
	checkWFProgress: function(){
		var state = 'failure';
		var currTime = new Date().getTime();
		// timeout
		var startTime = gs.getSession().getProperty('startTime');
		if (currTime - startTime > this.wfTimeOut) {
		    return 'wf_timeout';
		}
		var gr = new GlideRecord('wf_context');
		var ctxId = gs.getSession().getProperty('ctxId');
		if(gr.get(ctxId)){
			state = gr.getValue('state');
		}
		return state;
	},
	
	_getIdentificationProcessorId: function(processId) {
		var procGr = new GlideRecord('pwd_process');
		procGr.get(processId);
		var idenSysId = procGr.getValue('identification_type');

		var idenGr = new GlideRecord('pwd_identification_type');
		idenGr.get('sys_id', idenSysId);
		return idenGr.getValue('identification_processor');
	},
	
	
	
    type: 'ResetPwdAjaxProcessor'
});
```