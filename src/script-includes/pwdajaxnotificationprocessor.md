---
title: "PwdAjaxNotificationProcessor"
id: "pwdajaxnotificationprocessor"
---

API Name: global.PwdAjaxNotificationProcessor

```js
var PwdAjaxNotificationProcessor = Class.create();
PwdAjaxNotificationProcessor.prototype = Object.extendsObject(PwdAjaxRequestProcessor, {
	INVALID_PHONE_NUMBER: -4,
    INVALID_REQUEST_RESPONSE: -3,
	PAUSE_WINDOW_RESPONSE: -2,
	PER_DAY_LIMIT_RESPONSE: -1,
	GENERIC_FAIL_RESPONSE: 0,
	SUCCESS_RESPONSE: 1,
	
	// Handle response code and return response message
	_handleResponse: function(response, verificationId, retVal) {
		if (response == this.SUCCESS_RESPONSE) {
			var expiry = new SNC.PwdSMSManager().getExpiryByVerificationId(verificationId);
			var msgKey = "Verification Code Sent Message";
			var responseMsg = gs.getMessage(msgKey, expiry);  // I18N_OK 08-04-16
			
			this._setResponseMessage("success", responseMsg, retVal);
		}
		else {
			var msg;
			switch (response) {
				case this.PER_DAY_LIMIT_RESPONSE:
					var per_day_limit = this._getVerificationParam(verificationId, "max_per_day", "password_reset.sms.max_per_day");
					msg = gs.getMessage('Cannot send more than {0} verification codes in a day', [per_day_limit]);
					break;
				case this.PAUSE_WINDOW_RESPONSE:
					var pause_window = this._getVerificationParam(verificationId, "pause_window", "password_reset.sms.pause_window");
					msg = gs.getMessage('You can send a new verification code after {0} minutes', pause_window);
					break;
				case this.INVALID_REQUEST_RESPONSE:
					msg = gs.getMessage('Your password reset request is no longer valid. Submit another request.');
					break;
				case this.INVALID_PHONE_NUMBER:
					msg = gs.getMessage('Could not deliver the code via SMS text. The number is not a valid phone number (not E.164 compliant).');
					break;
				default:
					msg = gs.getMessage('Could not generate a verification code');
			}		
		    this._setResponseMessage("fail", msg, "false");	
		}
	},
	
	// Handle sending enrollment code response
	_handleEnrollResponse: function(response, deviceId, userId) {
		if (response) {
			new PwdNotificationHelper().subscribeDevice(deviceId, userId);
			var msg = gs.getMessage('The device has been authorized');
            this._setResponseMessage("success", msg, deviceId);
        }
		else  
            this._setResponseMessage("fail", gs.getMessage("The verification code does not match"), "false");
	},
	
	_getVerificationParam: function (verificationId, parameter, property) {
		var value = new SNC.PwdVerificationManager().getVerificationParamValue(verificationId, parameter);
		if (value == null) {
			value = GlideProperties.get(property,'0');
		}
		return value;
	},
	
    type: 'PwdAjaxNotificationProcessor'
});
```