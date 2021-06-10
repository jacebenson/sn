---
title: "PwdSMSNotificationManager"
id: "pwdsmsnotificationmanager"
---

API Name: global.PwdSMSNotificationManager

```js
var PwdSMSNotificationManager = Class.create();
PwdSMSNotificationManager.prototype = Object.extendsObject(PwdNotificationManager, {	
	
	TYPE: "SMS",
	NotEnrolled: "mobile",
	INVALID_PHONE_NUMBER: -4,
	
    initialize: function() {
		this.useNotifyPlugin = GlidePluginManager.isRegistered('com.snc.notify');
    },
	
	/* 
	  Send reset code to enrolled devices or devices from user profile
	  @param requestId
	  @param verificationId
	  @param mode: subscription or mobile
	  @param providerId: optional
	*/
	sendResetCode: function(requestId, verificationId, mode, providerId) {
		var response = this.GENERIC_FAIL_RESPONSE;
		
		try {
			response = this.pwdNotifMgr.generateSMSCode(requestId, verificationId);
		
			if (response == this.SUCCESS_RESPONSE) {
				var userSysId = this._getUserId(requestId);
				var devices = this._collectDevicesAddress(userSysId, mode, providerId);
				if (devices.length == 0)
					return this.GENERIC_FAIL_RESPONSE;

				var code = this.pwdNotifMgr.getLastSMSCode(requestId);
				this._sendCodeToDevices(devices, code, userSysId);
			}
		} catch(err) {
			return err;
		}
			
		return response;
	},
	
	/*  
	  Verify reset code
	  @param requestId
	  @param verificationId
      @param code
	*/
	verifyResetCode: function(requestId, verificationId, code) {
		return this.pwdNotifMgr.verifySMSCode(requestId, verificationId, code);
	},
	
	// @Override
	_getDeviceAddr: function(notifDevGr) {
		if (this.useNotifyPlugin) 
			return this._getPhoneNumber(notifDevGr);
		else
			return notifDevGr.getValue("email_address");  // SMS address is constructed as email_address: 1234567@txt.att.net
	},
	
	// @Override
	// Take the mobile phone number from profile as it is
	_getDeviceAddrFromProfile: function(userId, providerId) {
		var phone = this.pwdNotifHelper.getMobileFromProfile(userId);
		if (phone == null) 
			return null;
		
		// remove non digits but keep plus if there is one for it could be an international format
		phone = String(phone).replace(/[^0-9+]/g,''); 
		
		var deviceId = this.pwdNotifHelper.deviceExistsForPhone(userId, phone);
		if (deviceId == null)
			deviceId = this.pwdNotifHelper.createDevice(userId, phone, providerId, 'Mobile from User profile');			
		else if (!this.pwdNotifHelper.updateProvider(deviceId, providerId))
			return null;

		var notifDevGr = new GlideRecord("cmn_notif_device");
		notifDevGr.get(deviceId);
		
		return this._getDeviceAddr(notifDevGr);  
	},
	
	// @Override
	_sendCodeToDevices: function(devices, code, userSysId) {
		if (this.useNotifyPlugin)
			this._sendSMSCodeViaNotifyPlugin(devices, code);
		else {
			var parm1 = devices.join(",");
			
			// DEF0063745: Need to pass notification_type
		    parm1 = "SMS," + parm1;
			
			// PRB1263734: Use cmn_notif_device as the target record to check ACL
			var deviceGr = this._getDeviceGr(userSysId);
			
			gs.eventQueue(this.PWD_CODE_EVENT, deviceGr, parm1, code);
		}
	},
	
	_getPhoneNumber: function (notifDevGr) {
	    var grPwdDevice = new GlideRecord('pwd_device');
	    grPwdDevice.addQuery('device', notifDevGr.sys_id);
	    grPwdDevice.query();
		if (grPwdDevice.next()) {        // Subscription mode
			var code = grPwdDevice.getValue('country_code');

			// set default country code and country name
			if (!code) {
				grPwdDevice.setValue('country_code', '+1');
				grPwdDevice.setValue('country_name', 'United States');
				code = '+1';
			}
			grPwdDevice.update();
			return code + notifDevGr.getValue("phone_number");
		}
		else {                           // Mobile mode
			// Phone number needs to be E.164 compliant
			var phoneNumber = notifDevGr.getValue("phone_number");
			var gePN = new GlideElementPhoneNumber();
            if (!gePN.setPhoneNumber(phoneNumber, true))
				throw this.INVALID_PHONE_NUMBER;
			return phoneNumber;
		}
			
    },
	
	_sendSMSCodeViaNotifyPlugin: function(phoneNumbers, code) {
		var notify = new SNC.Notify();
	    var notifyPhoneNumbers = notify.getPhoneNumbers();
		if (notifyPhoneNumbers == null || notifyPhoneNumbers.size() == 0)
			return;
		
		var notifyPhoneNumber = notifyPhoneNumbers.get(0);
		phoneNumbers.forEach(function(phoneNumber) {
			notify.sendSMS(notifyPhoneNumber, phoneNumber, 
						   gs.getMessage('Password reset verification code: {0}', code));
		});
	},

    type: 'PwdSMSNotificationManager'
});
```