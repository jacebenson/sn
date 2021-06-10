---
title: "ProductFieldCheck"
id: "productfieldcheck"
---

API Name: global.ProductFieldCheck

```js
var ProductFieldCheck = Class.create();
ProductFieldCheck.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	isAnAssetForm: function(current_view, current_target){
		var isReferenceList = (current_view == 'sys_ref_list');
		var isHardwareForm = (current_target == 'alm_hardware.model');
		var isConsumableForm = (current_target == 'alm_consumable.model');
		var isFacilityForm = (current_target == 'alm_facility.model');
		return isReferenceList && (isHardwareForm || isConsumableForm || isFacilityForm);
	},

    type: 'ProductFieldCheck'
});
```