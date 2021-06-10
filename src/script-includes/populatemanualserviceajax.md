---
title: "PopulateManualServiceAjax"
id: "populatemanualserviceajax"
---

API Name: global.PopulateManualServiceAjax

```js
var PopulateManualServiceAjax = Class.create();
PopulateManualServiceAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	/**
	 * This AJAX returns NULL on success.
	 * On error, a JSON will be returned {error_source: String, error_msg: String}.
	 * Use answer.evalJSON() on the receiving side, if answer is NOT NULL.
	 */
	process: function() {
		var service_id = String(this.getParameter('sysparm_service_id'));
		var levels = String(this.getParameter('sysparm_levels'));
		var isDynamic = String(this.getParameter('sysparm_is_dynamic'));
		
		var pms = new PopulateManualService();
		return pms.process(service_id, levels, isDynamic);
	},
	
	type: 'PopulateManualServiceAjax'
});
```