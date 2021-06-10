---
title: "PwdAjaxVerifyProcessor"
id: "pwdajaxverifyprocessor"
---

API Name: global.PwdAjaxVerifyProcessor

```js
var PwdAjaxVerifyProcessor = Class.create();

PwdAjaxVerifyProcessor.prototype = Object.extendsObject(PwdAjaxRequestProcessor, {
	
	QA_VERIFICATION_TYPE_ID: '39b15343eb10010045e1a5115206feb7',
	
	verifyBL : new PwdVerifyStageBL(),
	
	isPublic: function() {
		return true;
	},
		
	/************
 	* pwdAjaxVerifyProcessor() - Server side Ajax processor for verifying the user (iterate through the various verification methods).
 	*
 	* Required Properties:
 	*  @sysparm_enrolled_user_id - a "session" property containing the enrolled user id.
 	*  @sysparm_request_id       - a "session" property containing the request id.
 	*
 	* Return value:
 	* "ok"     - if user is verified (by ALL verification methods).
 	* "block"  - If too many attempts where made, and we'd like to block this user.
 	* <error>  - Any other string, with the error (reason for failing); For example: "No request info found".
 	*
 	***********/
	/* eslint-disable consistent-return */ 
	pwdAjaxVerifyProcessor: function() {
		
		// check the security before anything else.
		// If any violation is found, then just return.
		if (!this._validateSecurity())
			return;		
				
		// Intentionally delay the response to ensure "bots" cannot attempt this ajax calls too frequently:
		var milli = GlideProperties.getInt('password_reset.verification.delay', 1000);
		new SNC.PwdUtil().sleep(milli);
		
		var userId = gs.getSession().getProperty('sysparm_sys_user_id');
		var requestId = gs.getSession().getProperty('sysparm_request_id');
		var userInput = gs.getSession().getProperty('sysparm_user_input');
	
		var processId = this.verifyBL.trackingMgr.getProcessIdByRequestId(requestId);
		var verificationId = this.getParameter('sysparm_verification_id');
				
		// return error if the request does not exist
		if (!this.verifyBL.requestExists(requestId))
			return "block";
		
		// If a verification id is specified, then only check that one. Otherwise, check all verifications
		// for the process. Only "checkAllVerifications" (for the process) can advance the verification stage. 
		var isValid = gs.nil(verificationId)? this.verifyBL.checkAllVerifications(userId, processId, requestId, this.request) :
											  this.verifyBL.checkVerification(userId, processId, verificationId, requestId, this.request);
		
		
		
		// return error if all verifications were not successful:
		if (!isValid)
			return this._handleRetry(requestId, userInput, processId, verificationId, userId);
		else {
			   if(this.request.getParameter('sysparm_isFinalVerification')){
				gs.info("User verified Suceessfully")
			    this.verifyBL.trackingMgr.updateRequestStatus(requestId, 2);
 				gs.getSession().putProperty('sysparm_is_verified', true);
		     }
		}
		
		return "ok";
	},
	/* eslint-enable consistent-return */ 
		
	_handleRetry: function(requestId, userInput, processId, verificationId, userId) {		
		var retry = this.verifyBL.trackingMgr.updateRequestRetry(requestId);			
		var retryResponse = this.newItem("retry");
		retryResponse.setAttribute("count", retry);
		
		if (retry < 0) {
			this.verifyBL.logWarning("Maximum retries reached, blocking user", requestId);
			return "block";
		} 
		else {
			/* Check to see if there is a retry macro that we want to compute. Right now, only QA verification type has this
			 * 2 cases to check:
			 *    1. Verification ID is known - check just that verification
			 *    2. Verification ID is unknown - check all the verifications for the process. 
			 */
			var verificationsToCheck = gs.nil(verificationId) ? new SNC.PwdProcessManager().getVerificationIdsByProcessId(processId) : 
																[verificationId];
			var qaVerGr = new GlideRecord('pwd_verification');
			qaVerGr.addQuery('type', this.QA_VERIFICATION_TYPE_ID);
			qaVerGr.addQuery('sys_id', 'IN', verificationsToCheck);
			qaVerGr.query();
			
			if (qaVerGr.next()) {
				var verificationType =  new SNC.PwdVerificationType(this.QA_VERIFICATION_TYPE_ID);						
				var macroName = verificationType.getVerificationUI();
				var jellyRunner = new GlideJellyRunner();
		
				jellyRunner.setVariable('sysparm_verification_id', qaVerGr.getUniqueValue());
				jellyRunner.setVariable('sysparm_sys_user_id', userId);
				jellyRunner.setVariable('sysparm_request_id', requestId);
				retryResponse.setAttribute("retry_macro", jellyRunner.runMacro(macroName));				
			}
			
			this.verifyBL.logWarning("Attempt " + retry + " failed, allowing retry", requestId);
			
			// Return the user info that user typed in on the identify page			
			return userInput;
		}
	},
	
	type: 'PwdAjaxVerifyProcessor'
});
```