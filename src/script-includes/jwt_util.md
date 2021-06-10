---
title: "JWT_Util"
id: "jwt_util"
---

API Name: global.JWT_Util

```js
var JWT_Util = Class.create();
JWT_Util.prototype = {
	initialize: function() {
	},
	
	sendEmailNotificationBasedOnExpiry:function (keyRecord){
		if(keyRecord == null) {
			gs.log("JWT key record is null.");
			return;
		}
		
		var expiresAt = keyRecord.expiry;
		var signingKeystore = keyRecord.signing_keystore;
		if (!expiresAt.nil() && !signingKeystore.nil()) {
			var gdt = new GlideDateTime();
			var daysToExpire = GlideDateTime.subtract(gdt, expiresAt.getGlideObject()).getRoundedDayPart();

			var daysToWarn = keyRecord.signing_keystore.warn_in_days_to_expire;
			var eventName;
			// Find which event is to be fired
			// Check if the key record is expired
			if (daysToExpire <= 0) {
				eventName = "jwt.key.expired";
			} // Else Check if key record is about to expire
			else if(daysToExpire <= daysToWarn) {
				eventName = "jwt.key.expiring";
			}

			// Add the event to the Queue.
			if (eventName) {
				// Get the recipients, to whom the mail notification is to be sent.
				var recipients = keyRecord.signing_keystore.notify_on_expiration;
				gs.debug('Triggering ' + eventName + ' event for the Key : ' + keyRecord.name + '. DaysToExpire is : ' + daysToExpire + ' and DaysToWarn is : ' + daysToWarn);
				gs.eventQueue(eventName, keyRecord, daysToExpire, recipients);
			}
		}
	},
	
	type: 'JWT_Util'
};
```