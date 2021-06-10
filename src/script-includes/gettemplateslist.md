---
title: "GetTemplatesList"
id: "gettemplateslist"
---

API Name: global.GetTemplatesList

```js
var GetTemplatesList = Class.create();

GetTemplatesList.getGlideRecord = function(table) {
	var encQuery = "table=" + table;
	encQuery += "^active=true";
	encQuery += "^global=true";
	encQuery += "^ORuser=javascript:gs.getUserID()";
	encQuery += "^ORgroups=javascript:getMyGroups()";
	encQuery += "^ORrolesIN" + GlideSession.get().getRoles();

	var gr = new GlideRecord("sys_template");
	gr.addEncodedQuery(encQuery);
	gr.orderBy("name");
	gr.setWorkflow(false);
	gr.query();
	return gr;
};

GetTemplatesList.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	returnList: function() {
		var table = this.getParameter("sysparm_table_name");
		var tt = GetTemplatesList.getGlideRecord(table);
		while (tt.nextRecord()) {
			var template = this.newItem("template");
			template.setAttribute("name", tt.getValue('name'));
			template.setAttribute("sys_id", tt.getUniqueValue());
			template.setAttribute("application", tt.getValue('sys_scope'));
			template.setAttribute("show_on_template_bar", tt.getValue("show_on_template_bar"));
		}
	},

	type: "GetTemplatesList"
});
```