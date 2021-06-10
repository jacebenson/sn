---
title: "PwdResetHelper"
id: "pwdresethelper"
---

API Name: global.PwdResetHelper

```js
var PwdResetHelper = Class.create();

// @return {boolean} specifying if the new password is strong or not
PwdResetHelper.validateNewPasswordComplexity = function(processId, newPasswd) {
	var credMgr = new SNC.PwdCredentialStoreManager();
	var credId = credMgr.getCredentialStoreIdByProcessId(processId);

	var credGr = new GlideRecord('pwd_cred_store');
	if (credGr.get(credId)) {
		var pwdRule = credGr.getValue('pwd_rule');
		var pwdRuleCall = pwdRule + '\nisPasswordValid(password);';
		credGr.setValue('pwd_rule', pwdRuleCall);
		var vars = {'password' : newPasswd};
			
		var evaluator = new GlideScopedEvaluator();
		var pwdValid = evaluator.evaluateScript(credGr, 'pwd_rule', vars);
		if (pwdValid) {
			return true;
		}
	}
	return false;	
};

/**
	Execute the post processor script include
	@param {String} requestId
	@param {String} processId
	@param {boolean} wfSuccess
	@return {"status":, "message":, "value":}
*/
PwdResetHelper.executePostProcessorScript = function(requestId, processId, wfSuccess) {
	
	if (gs.nil(processId) || gs.nil(requestId))
		return {status: 'failure', message: 'Either process id or request id is null', value: ''};
	
	// If wfSuccess is null, we will consider it as false
	wfSuccess = !gs.nil(wfSuccess);
	
    var LOG_ID = "[PwdAjaxWFRequestProcessor:runPostProcessor] ";
    var trackingMgr = new SNC.PwdTrackingManager();	
	
    var gr = new GlideRecord('pwd_process');
    if (!gr.get(processId)) {
		var errorMsg = "Cannot load the process: " + processId;
        trackingMgr.createActivity(PwdConstants.TYPE_WARNING, PwdConstants.STAGE_RESET, errorMsg, requestId);
        var responseErrorMsg = gs.getMessage("{0} Cannot load the process: {1}", [LOG_ID, processId]);
        return {status: 'failure', message: responseErrorMsg, value: ''};
	}
        
    if (!gs.nil(gr.post_processor)) {
        var postProcessorId = gr.post_processor;
        var postProcessorName = gr.post_processor.name;
		
        try {
			// Invoke the post process script include selected on the process    
			// published interface for the password_reset.extension.post_rest_script extensions (see pwd_extension_type) is:
			//
			// @param params.resetRequestId The sys-id of the current password-reset request (table: pwd_reset_request)
			// @param params.wfSuccess      A flag indicating if workflow completed sucessfully. True if (and only if) sucessful.
			// @return no return value
			var params = new SNC.PwdExtensionScriptParameter();
			params.resetRequestId = requestId;  
			params.wfSuccess = wfSuccess;
			var postResetExtension = new SNC.PwdExtensionScript(postProcessorId);
                
			var infoMsg = "Starting post-processor script: " + postProcessorName;
			trackingMgr.createActivity(PwdConstants.TYPE_INFO, PwdConstants.STAGE_RESET, infoMsg, requestId);   
			postResetExtension.process(params);             
		} catch (error) {
			var exceptionMsg = gs.getMessage("Error while executing post-processor script: {0}. Error:{1}", [postProcessorName, error]);
			trackingMgr.createActivity(PwdConstants.TYPE_INFO, PwdConstants.STAGE_RESET, exceptionMsg, requestId);
			var responseExceptionMsg = gs.getMessage("{0} Error while executing post-processor script {1}. Error: {2}", 
										[LOG_ID, postProcessorName, error]);
			return {status: 'failure', message: responseExceptionMsg, value: ''};
		}
		
		var successMsg = gs.getMessage("Completed post-processor script: {0}", postProcessorName);
		trackingMgr.createActivity(PwdConstants.TYPE_INFO, PwdConstants.STAGE_RESET, successMsg, requestId);
		var responseSuccessMsg = gs.getMessage("{0} Completed post-processor script: {1}", [LOG_ID, postProcessorName]);
		return {status: 'success', message: responseSuccessMsg, value: ''};
	}
};
//Check if midserver is running.
PwdResetHelper.IsMidRunning = function(procId) {
	
	// Check if midserver is runnign if process uses Active directory
	var procGr = new GlideRecord('pwd_process');
	    procGr.get(procId);
	var credStoreId = procGr.getValue('cred_store');
	var pwdCredStor = new GlideRecord('pwd_cred_store');
	pwdCredStor.get(credStoreId);
	var credStoreType = pwdCredStor.getValue('type'); 
	
	//Active Directory credential store type.
	var pwdCredStoreType = '94d5b6debf440100710071a7bf0739d9';
	var midServerRunning = true;
	
	if(credStoreType == pwdCredStoreType) {
		midServerRunning = false;
		var eccAgent = new GlideRecord('ecc_agent');
		eccAgent.query();
		while(eccAgent.next()) {
			var agentId = eccAgent.getUniqueValue();
			var agentCapability = new GlideRecord('ecc_agent_capability_m2m');
			agentCapability.addQuery('agent', agentId);
			var reqCapabilities = agentCapability.addQuery('capability', '427709a60a0006bc7d2904e99132532d');
			reqCapabilities.addOrCondition('capability', 'eeab973fd7802200bdbaee5b5e610381');
			agentCapability.query();
			if(agentCapability.hasNext()) {
				var midServerStatus = eccAgent.getValue('status');
				var midServervalidated = eccAgent.getValue('validated');
				if((midServerStatus == 'Up') && (midServervalidated == 'true')) {
					midServerRunning = true;
					break;
				}
			}
		}
	}
	return midServerRunning;
};

```