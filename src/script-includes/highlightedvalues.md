---
title: "HighlightedValues"
id: "highlightedvalues"
---

API Name: global.HighlightedValues

```js
var HighlightedValues = Class.create();
HighlightedValues.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	isDuplicateRecord : function() {
		var table = this.getParameter('sysparm_table');
		var field = this.getParameter('sysparm_field');
		var workspace = this.getParameter('sysparm_ws');
		var sysId = this.getParameter('sysparm_current_sys_id');
		var gr = new GlideRecord('sys_highlighted_value');
		gr.addQuery('table',table);
		gr.addQuery('field',field);
		if (workspace)
			gr.addQuery('workspace', workspace);
		else
			gr.addNullQuery('workspace');
		gr.query();
		return gr.next() && gr.getUniqueValue() != sysId;
	},

    type: 'HighlightedValues'
});
```