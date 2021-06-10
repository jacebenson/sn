---
title: "cxs_ActivityStream"
id: "cxs_activitystream"
---

API Name: global.cxs_ActivityStream

```js
var cxs_ActivityStream = Class.create();

cxs_ActivityStream.prototype = {
	FIELDS : ["comments", "work_notes"],
    insertActivity: function(source_doc_table, source_doc_id, text, field){
		var source_table = new TableUtils(source_doc_table);
		if(this.FIELDS.indexOf(field) < 0 || source_table.getAbsoluteBase() != "task")
			return;

		var grs = new GlideRecordSecure(source_doc_table);
		grs.get(source_doc_id);
		grs[field] = text;
		grs.update();
	},

    type: "cxs_ActivityStream"
};
```