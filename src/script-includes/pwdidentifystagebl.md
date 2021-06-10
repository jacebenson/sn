---
title: "PwdIdentifyStageBL"
id: "pwdidentifystagebl"
---

API Name: global.PwdIdentifyStageBL

```js
var PwdIdentifyStageBL = Class.create();
PwdIdentifyStageBL.prototype = Object.extendsObject(PwdResetStageBaseBL, {
	
	REQUEST_TYPE : 1, // self-service reset password
	
	DEFAULT_SELF_SERVICE_PROCESS_ID : 'c6b0c20667100200a5a0f3b457415ad5',
	
	NOTIFY_EMAIL : "2",
	PWD_RESET_URL_NOTIFICATION : "9546d4509f131200f45c7b9ac42e70ca", 
	UNSUBSCRIBE_NOTIFICATION_FILTER : "c1bfa4040a0a0b8b001eeb0f3f5ee961",
			
    initialize: function() {
		this.STAGE = PwdConstants.STAGE_IDENTIFICATION;
    },
    
	// @param idenObjs [{user_input, processor_id}]
	verifyIdentity: function(processId, idenObjs, captchaText, webRequest) {
		
		// return error if the process is undefined.
		var process = new SNC.PwdProcess(processId);
		if (!process.exists()) {
			this.logError("Process does not exist (" + processId + ").", "");
			return "process does not exists";
		}
		
		//If captcha is enabled, check if the answer is correct.
		if (process.getDisplayCaptcha()) {
			if(this._isGoogleCaptchaUsed()) {
				if(!this._vefifyGoogleCaptchaToken(captchaText)){
					this.logWarning("unsuccessful Google recaptcha validation", "");
					return "bad captcha";
				}
			}
			else if (!this._verifyDefaultCaptcha(captchaText)) {

				// this is the default captcha.
				// Check if the passed captch matches the one that was shown to the user:
				this.logWarning("Captcha does not match", "");
				return "bad captcha";
			}
		} // end of captcha handling.
		
		// Fetch user sys ID based on the user input
		var userSysId;
		var res = this._getUserSysId(idenObjs, process, webRequest);
		if (!res.status)
			return res.returnMsg;
		else
			userSysId = res.userSysId;
		
		
		// Start logging the password reset request:
		var trackingMgr = this.trackingMgr;
		var request_id = trackingMgr.createRequest(processId, userSysId, gs.getSessionID(), this.REQUEST_TYPE);
		
		// Prepare session params to pass to next step:
		gs.getSession().putProperty('sysparm_request_id', request_id);
		gs.getSession().putProperty('sysparm_sys_user_id', userSysId);
		gs.getSession().putProperty('sysparm_user_input', idenObjs[0].user_input);
		gs.getSession().putProperty('sysparm_directory', this.type);
		
		// For the default self service process, return error if the user is locked out and process unlock_account is off
		if (this._lockedOutError(userSysId, processId)) {
			var lockedOutMsg = "Cannot create request (process_id = " + processId + ", user_sys_id = " + userSysId + ") because the user is locked out.";
			this.logError(lockedOutMsg, request_id);
			return "locked";
		}
		
		// return error if the user is blocked
	    if (trackingMgr.isRequestLocked(userSysId, processId)) {
	    	var blockedMsg = "Cannot create request (process_id = " + processId + ", user_sys_id = " + userSysId + ") because the user is blocked.";
			this.logError(blockedMsg, request_id);
			return "block";
		}
		
		// Return error if the user does not belong to this process:
		var enrollMgr = new SNC.PwdEnrollmentManager();
		if(!enrollMgr.doesUserBelongToProcess(userSysId, processId)) {
			var userMsg = "User is not in process (process_id = " + processId + ", user_sys_id = " + userSysId + ")";
			this.logWarning(userMsg, request_id);
			return "user is not in process";
		}
		
		// Return error if the process emails a password reset url or emails new password via email, but the user has disabled notifications, or url notification for primary email
		if (process.getEmailPasswordResetUrl() || process.getSendEmail()) {
			var userGr = new GlideRecord("sys_user");
			userGr.get(userSysId);
			var email = userGr.getValue("email");
			if (gs.nil(email) || userGr.getValue("notification") != this.NOTIFY_EMAIL) {
				return "user cannot receive email";
			}
			
			var deviceGr = new GlideRecord("cmn_notif_device");
			deviceGr.addQuery("user", userSysId);
			deviceGr.addQuery("email_address", email);
			deviceGr.addQuery("type", "Email");  //DEF0061843
			deviceGr.query();
			deviceGr.next();
			
			var notifGr = new GlideRecord("cmn_notif_message");
			notifGr.addQuery("user", userSysId);
			notifGr.addQuery("device", deviceGr.getValue("sys_id"));
			notifGr.addQuery("notification", this.PWD_RESET_URL_NOTIFICATION);
			notifGr.query();
			notifGr.next();
			var notifFilter = notifGr.getValue("notification_filter");
		    if (notifFilter == this.UNSUBSCRIBE_NOTIFICATION_FILTER) {
		    	return "user cannot receive email";
		    }
		}

		var userVerifications = [];
		var processManager = new SNC.PwdProcessManager();
		
		// Retrieve and save all MANDATORY verifications:
		var mandatoryVerificationIds = processManager.getProcessVerificationIdsByMandatoryFlag(processId, true);
		
		var vArr = mandatoryVerificationIds.toArray();
		var verificationId;
		var userEnrolled;
		var verification;
		var notEnrolledMsg;
		
		for (var i = 0; i < vArr.length; i++) {
			verificationId = mandatoryVerificationIds.get(i);
			userEnrolled = enrollMgr.isUserEnrolledByVerificationId(userSysId, verificationId);
			if (!userEnrolled) {
				notEnrolledMsg = "User is not enrolled (process_id = " + processId + ", user_sys_id = " + userSysId + ")";
				this.logWarning(notEnrolledMsg, request_id);
				return "user is not enrolled";
			}
			
			verification = {};
			verification.mandatory = true;
			verification.verificationId = verificationId;
			verification.verified = false;
			userVerifications.push(verification);
		}
			
		// Retrieve and save all OPTIONAL verifications:
		var optionalVerificationIds = processManager.getProcessVerificationIdsByMandatoryFlag(processId, false);
		
		vArr = optionalVerificationIds.toArray();
		for (i = 0; i < vArr.length; i++) {
			verificationId = optionalVerificationIds.get(i);
			userEnrolled = enrollMgr.isUserEnrolledByVerificationId(userSysId, verificationId);
			if (userEnrolled) {
				verification = {};
				verification.mandatory = false;
				verification.verificationId = verificationId;
				verification.verified = false;
				userVerifications.push(verification);
			}
		}
		
		if (userVerifications.length < process.getMinVerifications()) {
            notEnrolledMsg = "User is not enrolled (process_id = " + processId + ", user_sys_id = " + userSysId + ")";
			this.logWarning(notEnrolledMsg, request_id);
            return "user is not enrolled";
		}
		
		if(this._verifyLDAPUser(userSysId, processId))
			return 'ldap error';

		// Update the password-reset request record (yey!, this is a valid, enrolled user):
		this.logInfo("User identified successfully (user_sys_id = " + userSysId + ")", request_id);
		var req = new GlideRecord('pwd_reset_request');
		if (req.get(request_id)) {
			if (req.lock_state != 0) {
				req.lock_state = 0;	// unknown
				req.update();
			}
		}
		
		return "ok";
	},
	
	/**
	* Tests if google captcha is being used or not.
	*/
	_isGoogleCaptchaUsed:function() {
		if (gs.getSession().getProperty('sysparm_is_desktop_request') == 'true') {
			return false;
		}
		return gs.getProperty('password_reset.captcha.google.enabled') == 'true';
	},
	
	_vefifyGoogleCaptchaToken:function(token){
		
		var captcha = new global.GoogleCaptcha();
		return captcha.verifyCaptcha(token);
	},	
	
	/**************
     * Provide default behavior. Since identification type is not mandatory
	 * in paswod reset process.
     * mandatory field in pwd_verification table.
     *
     * returns userSysId
     *
     * Params:
     * @userInput
     */
    _getDefaultUserSysId: function(userInput) {
		var gr = new GlideRecord('sys_user');
        gr.addQuery('user_name', userInput);
        gr.query();
        if (!gr.next()) {
			return null;
        }
        return gr.sys_id;
	},	
	
	_getUserSysId: function(idenObjs, process, webRequest) {
		var userSysId = '';
		var res = {
			status: false
		};
		
		for (var i = 0; i < idenObjs.length; i++) {
			var idenObj = idenObjs[i];
			
			// No identification type for the process then go with the default one
			if (idenObj.processor_id == 'default') {
				res.userSysId = this._getDefaultUserSysId(idenObj.user_input);
				if (gs.nil(res.userSysId)) {
					this.logWarning("User does not exist (" + idenObj.user_input + ")", "");
					res.returnMsg = "user does not exists";
				} else
				    res.status = true;
				return res;
			}
			
			// Evaluate identification type extension script to get user sys ID
			var tmpRes = this._getUserSysIdExtensionScript(idenObj.user_input, idenObj.processor_id, process, webRequest);
			
			// Identification fails
			if (!tmpRes.status) {
				this.logError(tmpRes.activityLogMsg, "");
				res.returnMsg = tmpRes.returnMsg;
				return res;
			}
			// User does not exist or user sys ID does not match
			else if (gs.nil(tmpRes.userSysId) || i > 0 && tmpRes.userSysId != userSysId) {
				this.logWarning("User does not exist (" + idenObj.user_input + ")", "");
				res.returnMsg = "user does not exists";
				return res;
			} 
			else {
				userSysId = tmpRes.userSysId;
			}
		}
		
		res.status = true;
		res.userSysId = userSysId;
		return res;
	},
	
	/**************
     * Params:
     * @identificationProcessorScript - Script that is used for verification
     * @userInput
	 * @idenProcessorId
	 * @process
	 * @returns object {status:    - signals if function has valid result 
	 *                  userSysId: - Sys-id for user or null if not found
	 *                  returnMsg
	 *                  activityLogMsg}
     */
    _getUserSysIdExtensionScript: function(userInput, idenProcessorId, process, webRequest) {
		var res = {};
        res.status = false;
		try {
			// Invoke the specific identification form processor extension
			// Published interface for identification_form_processors:
			//
			// @param params.processId   The sys-id of the calling password-reset process (table: pwd_process)
			// @param params.userInput   The user input to verify the identity
		    // @param request            The form request object. fields in the form can be accessed using: request.getParameter('<element-id>')
			// @return The sys-id of the user that corresponds to the requested input; if no user was found, null should be returned.			
			var params = new SNC.PwdExtensionScriptParameter();
			params.processId = process.getId();
			params.userInput = userInput;
			var identificationExtension = new SNC.PwdExtensionScript(idenProcessorId + '');
			var identifyResult = identificationExtension.processForm(params, webRequest);
			
            // Check we have either a null (no user found), a string or GlideElement (representing a Sys-id) result - Every other type we consider breaking the contract
            var resultType = (typeof(identifyResult) !== 'undefined') ? Object.prototype.toString.call(identifyResult).slice(8, -1).toLowerCase() : undefined;
            if (!( (resultType !== undefined && identifyResult === null)
                || (resultType === 'GlideElement'.toLowerCase()) 
                || ((resultType === 'String'.toLowerCase()) && (identifyResult.trim().length > 0))) ) {
			   
               res.activityLogMsg = "Error running identification processor " + idenProcessorId + ". " +
           							"Unexpected return value: " + identifyResult;

               res.returnMsg = "user identification failed";
               return res;
            }
            if (resultType !== undefined && identifyResult !== null) {
                res.userSysId = identifyResult.toString();
			}
			res.status = true;
		} catch(err) {
			// Most likely the processing script does not exists!!!
			res.activityLogMsg = "Error running identification processor " + idenProcessorId + ". " + err;
			res.returnMsg = "user identification failed";
		}

		return res;
	},
	
	/**************
	* returns true/false whether the captcha that is passed to the function is indeed the one that was presented to the user.
	*
	* Params:
	* @captcha - String containing the input captcha
	*/
	_verifyDefaultCaptcha: function(captchaText) {
		return new SNC.PwdImageCaptcha().validateCaptchaValue(captchaText);
	},
	
	_lockedOutError: function(userSysId, processId) {
		if (processId == this.DEFAULT_SELF_SERVICE_PROCESS_ID) {
			var grProcess = new GlideRecord("pwd_process");
			grProcess.get(processId);
			if (!grProcess.unlock_account) {
				var grUser = new GlideRecord("sys_user");
		        grUser.get(userSysId);
		        return grUser.locked_out;
			}
		}
		return false;
	},
	
	// Skip the reset process for LDAP users when using self service password reset.
	_verifyLDAPUser : function(userSysId, processId) {
		if(processId == 'c6b0c20667100200a5a0f3b457415ad5' && SNC.PasswordResetUtil.isLDAPUser(userSysId))
			return true;
		return false;
	},
	
    type: 'PwdIdentifyStageBL'
});
```