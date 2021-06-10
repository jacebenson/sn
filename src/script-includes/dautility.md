---
title: "DAUtility"
id: "dautility"
---

API Name: global.DAUtility

```js
var DAUtility = Class.create();
DAUtility.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getComponentAttributes: function(componentSysId) {
		if (!componentSysId)
			return JSON.stringify([]);

		var gr = new GlideRecord('sys_ux_lib_component_attr');
		gr.addQuery('model', componentSysId);
		gr.query();

		var attr = [];
		while (gr.next()) {
			attr.push({
				name: this._camelCaseString(gr.getValue('element')),
				value: gr.getValue('default_value')
			});
		}

		return attr;
	},

	getComponentAttributesAjax: function() {
		var componentSysId = this.getParameter('sysparm_componentSysId');
		return JSON.stringify(this.getComponentAttributes(componentSysId));
	},

	_camelCaseString: function(str) {
		return str.split(/[-_]/)
			.reduce(function(acc, curr, index) {
				var str = index === 0 ? curr : curr.charAt(0).toUpperCase() + curr.substring(1);
				return acc + str;
			}, '');
	},

	type: 'DAUtility'
});
```