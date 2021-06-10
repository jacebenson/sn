---
title: "cxs_Utils"
id: "cxs_utils"
---

API Name: global.cxs_Utils

```js
var cxs_Utils = Class.create();
cxs_Utils.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	/**
	 * hasAddlResourcesAJAX() client wrapper for hasAddlResources()
	 * @return {boolean | null}
	 */
	hasAddlResourcesAJAX: function() {
		var contextConfigID = this.getParameter('sysparam_context_config_id');
		return this.hasAddlResources(contextConfigID);
	},
	
	/**
	 * hasAddlResources() returns true/false if context config has associated addl. resource configs
	 * @param {String} contextConfigID - sys_id of Search Context Config
	 * @return {boolean | null}
	 */
	hasAddlResources: function(contextConfigID) {
		var addlRes = new GlideAggregate('cxs_res_context_config');
		addlRes.addAggregate('COUNT');
		addlRes.addQuery('cxs_context_config', contextConfigID);
		addlRes.addQuery('cxs_search_res_config.resource_type', '!=', null);
		addlRes.query();
		if (addlRes.next()) {
			var count = addlRes.getAggregate('COUNT');
			return (count > 0);
		}

		return null;
	},

    type: 'cxs_Utils'
});
```