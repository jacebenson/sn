---
title: "PwdVerifyStageBL"
id: "pwdverifystagebl"
---

API Name: global.PwdVerifyStageBL

```js
var PwdVerifyStageBL = Class.create();
PwdVerifyStageBL.prototype = Object.extendsObject(PwdResetStageBaseBL, {
	
	verificationMgr: new SNC.PwdVerificationManager(),
	
	initialize: function() {
		this.STAGE = PwdConstants.STAGE_VERIFICATION;
	},
	
	/** Check a single verification and return true if valid or false if invalid 
		@return {boolean} 
	*/
	checkVerification: function(userId, processId, verificationId, requestId, webRequestObj) {
		var verificationTypeId = this.verificationMgr.getVerificationTypeIdByVerificationId(verificationId);
		var verificationType =  new SNC.PwdVerificationType(verificationTypeId);
		if (!verificationType.exists()) {
			var invalidVerificationType = "Invalid verification type (process_id = " + processId + ", verification = " + verificationId + ")";
			this.logError(invalidVerificationType, requestId);

			return false;
		}
		
		var verificationProcessorId = verificationType.getVerificationProcessorId();
		if (!verificationProcessorId) {
			var invalidVerificationProc = "Invalid verification processor (process_id = " + processId + ", verification = " + verificationId + ")";
			this.logError(invalidVerificationProc, requestId);
			
			return false;
		}
		
		try {
			// Include the specific processor, and invoke its "verify" method
			
			// Published interface to verification form processor extensions
			//
			// @param params.resetRequestId The sys-id of the current password-reset request (table: pwd_reset_request)
			// @param params.userId         The sys-id of the user trying to be verified (table: sys_user)
			// @param params.verificationId The sys-id of the verification to be processed (table: pwd_verification)
			// @param request               The form request object. fields in the form can be accessed using: request.getParameter('<element-id>')
			// @return boolean telling whether the user is successfully verified
			
			var verificationParams = new SNC.PwdExtensionScriptParameter();
			verificationParams.resetRequestId = requestId;
			verificationParams.userId = userId;
			verificationParams.verificationId = verificationId;
			
			var verificationProcessorExtension = new SNC.PwdExtensionScript(verificationProcessorId);
			var extensionResult = verificationProcessorExtension.processForm(verificationParams, webRequestObj);
			var verificationResult;
			// If we didn't get the expected return type back, we mark this verification process as failed
			if (typeof(extensionResult) == 'boolean') {
				verificationResult = extensionResult;
			} else {
				gs.logWarning('Unexpected verification processor extension result: ' + extensionResult, 'PwdAjaxVerifyProcessor');
				verificationResult = false;
			}
			
			if (!verificationResult) 
				this.logWarning("Verification failed", requestId, 'pwd_verification', verificationId);
			
			return verificationResult;
		}
		catch(err) {
			// Most likely the processing script does not exist!
			var errorMsg = "Cannot process verification (verification_id = " + verificationId + ") + [" + err + "]";
			this.logError(errorMsg, requestId);
			
			return false;
		}
	},
		
	/** Check all verifications associated with the given process and return true if all are valid
		Also saves the state that the user is verified to allow going beyond the Verify page
		@return {boolean} 
	*/
	checkAllVerifications : function(userId, processId, requestId, webRequestObj) {
		var VERIFIED = 2;  // check out: "com.glideapp.password_reset.model.Request" for status enumerations.
		var validVerificationsCount = 0;
		var processMgr = new SNC.PwdProcessManager();
		
		var verificationId;
		var invalidVerificationMsg;
		var isValid;
		
		// -------------------------------------------------------
		// Handle all the MANDATORY verifications associated with this process:
		// -------------------------------------------------------
		var mandatoryVerificationIds = processMgr.getProcessVerificationIdsByMandatoryFlag(processId, true);
		for (var i = 0; i < mandatoryVerificationIds.size(); i++) {
			verificationId = mandatoryVerificationIds.get(i);
			
			if (!verificationId) {
				invalidVerificationMsg = "Invalid verification (process_id = " + processId + ", verification = " + i + ")";
				this.logError(invalidVerificationMsg, requestId);
				return "invalid verification in process";
			}

			isValid = this.checkVerification(userId, processId, verificationId, requestId, webRequestObj);
			if (!isValid)
				return false;
			
			++validVerificationsCount;			
		}
		// --------------------- END MANDATORY SECTION ---------------------
		
		// -------------------------------------------------------
		// Handle all the OPTIONAL verifications associated with this process:
		// -------------------------------------------------------
		
		var optionalVerificationIds = processMgr.getProcessVerificationIdsByMandatoryFlag(processId, false);
		for (i = 0; i < optionalVerificationIds.size(); i++) {
			verificationId = optionalVerificationIds.get(i);

			if (!verificationId) {
				invalidVerificationMsg = "Invalid verification (process_id = " + processId + ", verification = " + i + ")";
				this.logError(invalidVerificationMsg, requestId);
				return "invalid verification in process";
			}

			isValid = this.checkVerification(userId, processId, verificationId, requestId, webRequestObj);
			if (isValid)
				validVerificationsCount++;
		}
		// --------------------- END OPTIONAL SECTION ---------------------
		
		if (validVerificationsCount >= new SNC.PwdProcess(processId).getMinVerifications()) {
			// Log successful verification
			this.logInfo("User verified successfully", requestId);
			this.trackingMgr.updateRequestStatus(requestId, VERIFIED);
			gs.getSession().putProperty('sysparm_is_verified', true);	
			return true;
		}
		
		return false;
	},

    type: 'PwdVerifyStageBL'
});
```