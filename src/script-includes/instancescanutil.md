---
title: "InstanceScanUtil"
id: "instancescanutil"
---

API Name: global.InstanceScanUtil

```js
var InstanceScanUtil = Class.create();
InstanceScanUtil.prototype = {
    initialize: function() {
    },
	
	isCheckMuted: function(check) {
		return check.attributes.muted;
	},
	
	muteCheck: function(check) {
		this.setAttribute(check, 'muted', true);
	},
	
	unmuteCheck: function(check) {
		this.setAttribute(check, 'muted', false);
	},
	
	setAttribute: function(check, attributeName, attributeValue) {
		var attributes = new GlideRecord('scan_check_attributes');
		attributes.get(check.attributes);

		// If it doesn't exist, try to regenerate
		if (!attributes.isValidRecord()) {
			attributes = new GlideRecord('scan_check_attributes');
			attributes.get(this.generateAttributesRecordWithSysId(check, check.attributes.toString()));
			
			if (!attributes.isValidRecord()) {
				gs.addErrorMessage("The attributes record (scan_check_attributes) for this Check is missing/invalid and could not be regenerated.");
				return;
			}
		}

		// Ensure the field exists
		if (!attributes.isValidField(attributeName)) {
			gs.addErrorMessage("Attribute name \"" + attributeName + "\" is not valid");
			return;
		}

		// Update the attribute's reference, just in case it's incorrect
		attributes.setValue('check', check.getUniqueValue());

		// Update the attribute value
		attributes.setValue(attributeName, attributeValue);
		attributes.update();
	},
	
	generateAttributesRecord: function(check) {
		return this.generateAttributesRecordWithSysId(check, null);
	},

	generateAttributesRecordWithSysId: function(check, sysId) {
		var attributes = new GlideRecord('scan_check_attributes');
		attributes.initialize();
		
		if (sysId != null)
			attributes.setNewGuidValue(sysId);
		
		attributes.check = check.getUniqueValue();
		return attributes.insert();
	},

	hasTableAccess: function(tableName, accessType) {
		var gsm = GlideSecurityManager.get();
		return gsm.hasRightsTo("record/" + tableName + "/" + accessType, null);
	},

    type: 'InstanceScanUtil'
};
```