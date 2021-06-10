---
title: "AWListAttributeAjax"
id: "awlistattributeajax"
---

API Name: global.AWListAttributeAjax

```js
var AWListAttributeAjax = Class.create();
AWListAttributeAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
    modifyAttributes: function() {

		var attributesJSON = this.getParameter('sysparm_changedAttributes');
		var changedAttributes = JSON.parse(attributesJSON);
		var values = Object.keys(changedAttributes);
		
		for (var i = 0; i < values.length; i++) {
			var grSubmitAttributes = new GlideRecord('sys_aw_list');
			
			var sysids = changedAttributes[values[i]];
			
			if (!sysids.length)
				continue;
			
			var value = values[i];
		
			if (value === 'delete')
				value = 'NULL';
			
			grSubmitAttributes.addQuery('sys_id', 'IN', sysids);
			grSubmitAttributes.setValue('list_attributes', value);
			grSubmitAttributes.updateMultiple();
		}
	},

    type: 'AWListAttributeAjax'
});
```