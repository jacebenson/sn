---
title: "RelatedListItemCandidateFilter"
id: "relatedlistitemcandidatefilter"
---

API Name: global.RelatedListItemCandidateFilter

```js
var RelatedListItemCandidateFilter = Class.create();
RelatedListItemCandidateFilter.prototype = {
    initialize: function(tableName, parentFieldName, parentRecordSysId, referencedFieldName) {
		this.tableName = tableName;
		this.parentFieldName = parentFieldName;
		this.parentRecordSysId = parentRecordSysId;
		this.referencedFieldName = referencedFieldName;
    },
    getFilterQuery: function() {
       var selectedRecord = new GlideRecord(this.tableName);
        selectedRecord.addQuery(this.parentFieldName, this.parentRecordSysId);
        selectedRecord.query();
        var result = [];
        while (selectedRecord.next()) {
            result.push(selectedRecord.getValue(this.referencedFieldName));
        }
		
		if (result.length)
            return "sys_idNOT IN" + result.join(",");
		
        return "";
    },
	
	handles: function(thing){
		return thing == "DEFAULT";
	},

    type: 'RelatedListItemCandidateFilter'
};
```