---
title: "EmailAddressValidator"
id: "emailaddressvalidator"
---

API Name: global.EmailAddressValidator

```js
var EmailAddressValidator = Class.create();
EmailAddressValidator.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	applyFilters: function() {
		var emailAddress = this.getParameter("sysparm_email_address");
		var filterIds = this.getParameter("sysparm_address_filters");
		
		var emailAddressResult = sn_notification.AddressFilter.filter(filterIds, emailAddress);
		var isValid = emailAddressResult.isValid();
		var invalidReason = emailAddressResult.getInvalidReason();

		var result = this.newItem('result');
		result.setAttribute('is_valid', isValid);
		result.setAttribute('invalid_reason', invalidReason);
		result.setAttribute('email_address', emailAddress);
	},

	type: 'EmailAddressValidator'
});
```