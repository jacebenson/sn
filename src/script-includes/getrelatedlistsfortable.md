---
title: "GetRelatedListsForTable"
id: "getrelatedlistsfortable"
---

API Name: global.GetRelatedListsForTable

```js
var GetRelatedListsForTable = Class.create();
GetRelatedListsForTable.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getRelatedLists: function() {
		var tableName = this.getParameter('sysparm_table_name');
		var gr = new GlideRecord(tableName);
		var rl = gr.getRelatedLists();
		var values = rl.values().toArray();
		var keys = rl.keySet().toArray();
		var result = [];

		for (var i in values) {
			var item = {};
			item.relationship = keys[i];
			item.label = values[i];
			result.push(item);
		}

		var cl = new GlideChoiceListSet();
		var rel = new GlideRelationshipUtil();
		rel.addChoices(tableName, cl);

		for (var choice = 0; choice < cl.getColumns().size(); choice++) {
			var sysRelationshipItem = {};
			sysRelationshipItem.relationship = cl.getColumns().getChoice(choice).getValue();
			sysRelationshipItem.label = cl.getColumns().getChoice(choice).getLabel();
			result.push(sysRelationshipItem);
		}

		return JSON.stringify(result);
	},
    type: 'GetRelatedListsForTable'
});
```