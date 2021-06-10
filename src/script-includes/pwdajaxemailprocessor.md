---
title: "PwdAjaxEmailProcessor"
id: "pwdajaxemailprocessor"
---

API Name: global.PwdAjaxEmailProcessor

```js
var PwdAjaxEmailProcessor = Class.create();
PwdAjaxEmailProcessor.prototype = Object.extendsObject(PwdAjaxNotificationProcessor, {
	
	/*
	  Generate and send reset code for Email type
	  Code would be sent to enrolled devices for subscription mode
	  or profile device for notEnrolled mode
	*/
	generateCode: function() {
		var LOG_ID = "[PwdAjaxEmailProcessor.generateCode] ";
		
		var requestId = this.getParameter("sysparm_request_id");
		var verificationId = this.getParameter("sysparm_verification_id");		
		var mode = this.getParameter("sysparm_email_verification_mode");
		
		var response;
		if (mode != "subscription" && mode != "notEnrolled") {
		    gs.log(LOG_ID + 'Unknown mode!');
			response = this.GENERIC_FAIL_RESPONSE;
		}
	
		response = new PwdEmailNotificationManager().sendResetCode(requestId, verificationId, mode);
		
		this._handleResponse(response, verificationId, requestId);
	},
	
	/**
 	* Generates enrollment code for given email.
 	*/
	generateEnrollmentCode: function () {    
		var deviceId = this.getParameter("sysparm_device_id");
		var verificationId = this.getParameter("sysparm_verification_id");
				
		var response = new PwdEmailNotificationManager().sendEnrollmentCode(deviceId, verificationId);
		
		this._handleResponse(response, verificationId, deviceId);
	},
	
	/**
     * Verify enrollment code for the given email address.
     */
    verifyEnrollmentCode: function() {
		var deviceId = this.getParameter("sysparm_device_id");		
        var verificationId = this.getParameter("sysparm_verification_id");
        var userId = this.getParameter("sysparm_user_id");
        var code = this.getParameter("sysparm_email_code");
		
        var response = new PwdEmailNotificationManager().verifyEnrollmentCode(deviceId, verificationId, code);
        this._handleEnrollResponse(response, deviceId, userId);
    },

	type: 'PwdAjaxEmailProcessor'
});
```