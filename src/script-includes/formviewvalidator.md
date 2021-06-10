---
title: "FormViewValidator"
id: "formviewvalidator"
---

API Name: global.FormViewValidator

```js
var FormViewValidator = Class.create();
FormViewValidator.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    type: 'FormViewValidator',
	isValid: function() {
		var table = this.getParameter("sysparm_table");
		var view = this.getParameter("sysparm_view");
		var ga = new GlideAggregate('sys_ui_section');
		
		ga.addAggregate('COUNT');
		ga.addEncodedQuery("viewNOT LIKErpt^sys_userISEMPTY");
		ga.addQuery("name", table);
		ga.addQuery("view", view);
		ga.query();
		ga.next();
		return ga.getAggregate('COUNT') !== '0';
	} 
});
```