---
title: "UIBuilderRecordSearch"
id: "uibuilderrecordsearch"
---

API Name: sn_ui_builder.UIBuilderRecordSearch

```js
var UIBuilderRecordSearch = Class.create();
UIBuilderRecordSearch.prototype = {
    initialize: function() {},
	
	searchTableForResults: function(table, searchValue, options) {
		/** Validate the provided table */
		var referenceGlideRecord = new GlideRecord(table);
		if (!referenceGlideRecord.isValid()) {
			throw new Error('Invalid GlideRecord table provided');
		}

		/** Set the field and validate*/
		var field = options.field || referenceGlideRecord.getDisplayName();
		if (field && !referenceGlideRecord.isValidField(field)) {
			throw new Error('Invalid field provided');
		}

		/** Set the limit, validate, and ensure we don't return the world */
		var limit = options.limit || 20;
		if (isNaN(limit)) {
			throw new Error('Invalid limit provided, limit must be a number');
		}

		if (limit > 100) {
			throw new Error('Limit must be less than 100');
		}

		if (options.referenceFilter) {
			referenceGlideRecord.addQuery(options.referenceFilter);
		}
		
		/** Query GlideRecord */
		referenceGlideRecord.addQuery(field, 'CONTAINS', searchValue);
		
		
		referenceGlideRecord.setLimit(limit);
		referenceGlideRecord.query();

		var records = [];
		while (referenceGlideRecord.next()) {
			records.push({
				id: referenceGlideRecord.getUniqueValue(),
				label: referenceGlideRecord.getValue(field)
			});
		}

		return records;
	},

    type: 'UIBuilderRecordSearch'
};
```