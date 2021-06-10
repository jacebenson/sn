---
title: "PrincipalClass"
id: "principalclass"
---

API Name: global.PrincipalClass

```js
var PrincipalClass = Class.create();
PrincipalClass.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	getPrincipalClasses: function() {
		return this.getClasses(true);
	},
	
	getNonPrincipalClasses: function() {
		return this.getClasses(false);
	},

	getClasses: function(principal) {
		var classes = [];
		var gr = new GlideRecord('cmdb_class_info');
		gr.addQuery('principal_class', principal);
		gr.query();
		while(gr.next())
			classes.push(gr.getValue('class'));
		
		return classes;
	},

    type: 'PrincipalClass'
});
```