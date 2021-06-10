---
title: "ConditionsQuerySecure"
id: "conditionsquerysecure"
---

API Name: global.ConditionsQuerySecure

```js
var ConditionsQuerySecure = Class.create();
ConditionsQuerySecure.prototype = {
    initialize: function() {
    },
	
	getConditionQueryCount: function(tableName, encodedQuery) {
		if (!GlideTableDescriptor.isValid(tableName))
		   return "Not a valid table name";

		/*
		* Due to PRB1341370, we need to use GlideRecord to check ACLs.
		* Once the issue is fixed, we can use GlideAggregate for both
		* checking ACLs and finding row count.
		*/
		var access = new GlideRecord(tableName);
		if (!access.canRead())
			return "User not allowed to access table: " + tableName;

		var gr = new GlideAggregate(tableName);
		gr.addEncodedQuery(encodedQuery);
		gr.addAggregate("COUNT");
		gr.query();
		var count = 0;
		if (gr.next())
			count = gr.getAggregate("COUNT");

		var msg = gs.getMessage("records match condition");
		if (count == 1)
			msg = gs.getMessage("record matches condition");

		return count + " " + msg;
	},

    type: 'ConditionsQuerySecure'
};
```