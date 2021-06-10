---
title: "VAFieldValidator"
id: "vafieldvalidator"
---

API Name: global.VAFieldValidator

```js
var VAFieldValidator = Class.create();
VAFieldValidator.prototype = {
	 // Borrowed from this github project:  https://gist.github.com/dperini/729294
	initialize: function() {
		this._REGEXP_URL = new RegExp(
			"^" +
			// protocol identifier (optional)
			// short syntax // still required
			"(?:(?:(?:https?|ftp):)?\\/\\/)" +
			// user:pass BasicAuth (optional)
			"(?:\\S+(?::\\S*)?@)?" +
			"(?:" +
			// IP address exclusion
			// private & local networks
			"(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
			"(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
			"(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
			// IP address dotted notation octets
			// excludes loopback network 0.0.0.0
			// excludes reserved space >= 224.0.0.0
			// excludes network & broadcast addresses
			// (first & last IP address of each class)
			"(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
			"(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
			"(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
			"|" +
			// host & domain names, may end with dot
			// can be replaced by a shortest alternative
			// (?![-_])(?:[-\\w\\u00a1-\\uffff]{0,63}[^-_]\\.)+
			"(?:" +
			"(?:" +
			"[a-z0-9\\u00a1-\\uffff]" +
			"[a-z0-9\\u00a1-\\uffff_-]{0,62}" +
			")?" +
			"[a-z0-9\\u00a1-\\uffff]\\." +
			")+" +
			// TLD identifier name, may end with dot
			"(?:[a-z\\u00a1-\\uffff]{2,}\\.?)" +
			")" +
			// port number (optional)
			"(?::\\d{2,5})?" +
			// resource path (optional)
			"(?:[/?#]\\S*)?" +
			"$", "i"
		);
	},

	validateInternationalPhoneNumberFormat: function(value) {
		var nilCheck = this._checkForNil(value);
		if (!gs.nil(nilCheck)) {
			return nilCheck;
		}

		var preppedValue = value.toString().trim();
		//make sure value does not have any alphanumeric characters
		var result = preppedValue.match(/[a-zA-Z]/);
		if (!gs.nil(result)) {
			return false;
		}
		preppedValue = !preppedValue.startsWith("+") ? ("+" + preppedValue) : preppedValue;
		var gePN = new GlideElementPhoneNumber();
		gePN.setPhoneNumber(preppedValue, false);
		return {
			"value": value,
			"valid": gePN.isValid(),
			"territory": gePN.getTerritory(),
			"global_display_value": gePN.getGlobalDisplayValue(),
			"local_display_value": gePN.getLocalDisplayValue(),
			"local_dialing_code": gePN.getLocalDialingCode()
		};
	},

	validateEmailAddress: function(value) {
		var nilCheck = this._checkForNil(value);
		if (!gs.nil(nilCheck)) {
			return false;
		}
		var preppedValue = value.toString().trim();
		var result = preppedValue.match(/^\w+(([\.+-]\w)\w*)*@\w+(([\.-]\w)\w*)*(\.\w{2,3})$/);
		return !gs.nil(result) && result.length > 0;
	},

	validateURL: function(value) {
		var nilCheck = this._checkForNil(value);
		if (!gs.nil(nilCheck)) {
			return false;
		}
		var preppedValue = value.toString().trim();
		return this._REGEXP_URL.test(preppedValue);
	},

	validateIPAddress: function(value) {
		var nilCheck = this._checkForNil(value);
		if (!gs.nil(nilCheck)) {
			return false;
		}
		return !gs.nil((SncIPAddressV4.get(value) || SncIPAddressV6.get(value)));
	},

	_checkForNil: function(value) {
		if (gs.nil(value) || value.toString().trim().length==0) {
			return {"value": value, "valid": false};
		}
	},

	type: 'VAFieldValidator'
};

```