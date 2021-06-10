---
title: "PhoneNumberValidationUtils"
id: "phonenumbervalidationutils"
---

API Name: global.PhoneNumberValidationUtils

```js
var PhoneNumberValidationUtils = Class.create();
PhoneNumberValidationUtils.prototype = {
	PHONE_TERRITORY: {
		TABLE_NAME: 'sys_phone_territory',
		NAME: 'name',
		COUNTRY_CALLING_CODE: 'ccc'
	},
	CSM_CONSUMER: {
		TABLE_NAME: 'csm_consumer',
		USER: 'user'
	},

    initialize: function() {
    },

	/**
	 * Validate the phone number for sys user. If the userInput is valid, return the e164 format phone number. Otherwsie,
	 * fix the phone number and convert it to e164 format based on user's territory.
	 * @param {string} userInput
	 * @param {string} sysUserId the sys id of the sys user
	 * @returns {string} it returns the e164 format phone number if the validation passes. Otherwise it returns undefined.
	 */
	validatePhoneNumberForSysUser: function(userInput, sysUserId) {
		if (!userInput) {
			return;
		}

		var trimmedInput = userInput.trim();
		if (!trimmedInput) {
			return;
		}

		if (trimmedInput.match('^(00)')) {
			// if the input start with 00, change it to +
			trimmedInput.replaceAll('^(00)', '+');
		}
		var gePhoneNumber = new global.GlideElementPhoneNumber();
		if (!sysUserId) {
			gePhoneNumber.setAllowNationalEntry(false);
		} else {
			var userPhoneNumberFormat = gePhoneNumber.getPhoneFormatForUser(sysUserId);
			gePhoneNumber.setPhoneNumberFormat(userPhoneNumberFormat);
		}

		if (gePhoneNumber.setPhoneNumber(trimmedInput, true)) {
			return gePhoneNumber.getValue();
		}

		return;
	},

	/**
	 * Validate the phone number for consumer
	 * @param {string} userInput
	 * @param {string} consumerId the sys id of the consumer
	 * @returns {string} it returns the e164 format phone number if the validation passes. Otherwise it returns undefined.
	 */
	validatePhoneNumberForConsumer: function(userInput, consumerId) {

		if (!gs.tableExists(this.CSM_CONSUMER.TABLE_NAME)) {
			return this.validatePhoneNumberForSysUser(userInput, null);
		}

		var grConsumer = new GlideRecord(this.CSM_CONSUMER.TABLE_NAME);
		if (grConsumer.get(consumerId) && grConsumer.getValue(this.CSM_CONSUMER.USER)) {
			return this.validatePhoneNumberForSysUser(userInput, grConsumer.getValue(this.CSM_CONSUMER.USER));
		}

		return this.validatePhoneNumberForSysUser(userInput, null);
	},

    type: 'PhoneNumberValidationUtils'
};
```