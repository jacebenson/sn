---
title: "PwdAjaxSMSProcessor"
id: "pwdajaxsmsprocessor"
---

API Name: global.PwdAjaxSMSProcessor

```js
var PwdAjaxSMSProcessor = Class.create();
PwdAjaxSMSProcessor.prototype = Object.extendsObject(PwdAjaxNotificationProcessor, {
	
	/*
	  Generate and send reset code for SMS type
	  Code would be sent to enrolled devices for subscription mode
	  or profile device for mobile mode
	*/
	generateCode: function() {
		var LOG_ID = "[PwdAjaxSMSProcessor.generateCode] ";
		
		var requestId = this.getParameter("sysparm_request_id");
		var verificationId = this.getParameter("sysparm_verification_id");		
		var mode = this.getParameter("sysparm_sms_verification_mode");
		var providerId = this.getParameter("sysparm_service_provider");
		
		var response;
		if (mode != "subscription" && mode != "mobile") {
		    gs.log(LOG_ID + 'Unknown mode!');
			response = this.GENERIC_FAIL_RESPONSE;
		}
	
		response = new PwdSMSNotificationManager().sendResetCode(requestId, verificationId, mode, providerId);
		
		this._handleResponse(response, verificationId, requestId);
	},
	
	/**
 	* Generate and send enrollment code for given device.
 	*/
	generateEnrollmentCode: function () {
		var deviceId = this.getParameter("sysparm_device_id");
		var verificationId = this.getParameter("sysparm_verification_id");
				
		var response = new PwdSMSNotificationManager().sendEnrollmentCode(deviceId, verificationId);
		
		this._handleResponse(response, verificationId, deviceId);
	},
	
	/**
     * Verify enrollment code for the given device.
     */
    verifyEnrollmentCode: function() {
		var deviceId = this.getParameter("sysparm_device_id");		
        var verificationId = this.getParameter("sysparm_verification_id");
        var userId = this.getParameter("sysparm_user_id");
        var code = this.getParameter("sysparm_sms_code");
        
        var response = new PwdSMSNotificationManager().verifyEnrollmentCode(deviceId, verificationId, code);
        this._handleEnrollResponse(response, deviceId, userId);
    },

	type: 'PwdAjaxSMSProcessor'
});
```