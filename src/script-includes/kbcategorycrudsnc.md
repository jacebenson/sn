---
title: "KBCategoryCrudSNC"
id: "kbcategorycrudsnc"
---

API Name: global.KBCategoryCrudSNC

```js
var KBCategoryCrudSNC = Class.create();
	KBCategoryCrudSNC.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    type: 'KBCategoryCrudSNC',
	update: function() {
		var sysId = this.getParameter('sysparm_id') || '';
		var label = this.getParameter('sysparm_label') || '';
		var result = this.newItem("result");
		var gr = new GlideRecord('kb_category');
		if (gr.get(sysId) && gr.canWrite()) {
			gr.label.setDisplayValue(label + '');
			gr.value = gr.label.toLowerCase();
			gr.update();
			result.setAttribute('update', 'true');
		} else {
			result.setAttribute('update', 'false');
		}
		result.setAttribute("sysId", gr.sys_id);
	},
	create: function() {
		// table names constants
		var KB_KNOWLEDGE_BASE_NAME = 'kb_knowledge_base';
		var KB_CATEGORY_NAME = 'kb_category';
		var label = this.getParameter('sysparm_label') || '';
		// insert new record
		var gr = new GlideRecord('kb_category');
		gr.initialize();
		gr.parent_id = this.getParameter('sysparm_id') || '';
		gr.parent_table = (JSUtil.toBoolean(this.getParameter('sysparm_is_root'))) ? KB_KNOWLEDGE_BASE_NAME : KB_CATEGORY_NAME;
		gr.label.setDisplayValue(label + '');
		gr.value = gr.label.toLowerCase();
		gr.active = true;
		if(gr.canCreate())
			gr.insert();
		var result = this.newItem("result");
		result.setAttribute("sysId", gr.sys_id);
	},
	canCreate: function() {
		var gr = new GlideRecord('kb_category');
		gr.parent_id = this.getParameter('sysparm_id') || '';
		var result = this.newItem("result");
		result.setAttribute("canCreateCategory", gr.canCreate());
	}
});
```