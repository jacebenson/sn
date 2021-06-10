---
title: "FlowDesignerContentFiltering"
id: "flowdesignercontentfiltering"
---

API Name: global.FlowDesignerContentFiltering

```js
var FlowDesignerContentFiltering = Class.create();
FlowDesignerContentFiltering.prototype = {
    initialize: function() {},
	
	canRead: function(contentGr){
		if (gs.getProperty('com.glide.hub.flow.disable_content_filtering', 'false') == 'true')
			return true;

		if (contentGr.sys_created_by == gs.getUserName())
			return true;
		
		var tableHierarchy = this._getTableHierarchyFor(contentGr);
		
		var gr = new GlideRecord('sys_hub_resource_filter_rule');
		gr.addQuery('resource.table', 'IN', tableHierarchy);
		var qc = gr.addQuery('sys_scope', 'Global');
		qc.addOrCondition('sys_scope', contentGr.sys_scope);
		gr.addQuery('role', 'IN', gs.getSession().getRoles());
		gr.addActiveQuery();
		gr.query();
		while(gr.next()) {
			if (!gr.resource)
				continue;

			var conditionEmpty = GlideStringUtil.nil(gr.resource.conditions);
			var conditionTrue = GlideFilter.checkRecord(contentGr, gr.resource.conditions);
			var tagsSatisfied = this._hasRequiredLabelEntries(gr, contentGr, tableHierarchy);
			
			if ((conditionEmpty || conditionTrue) && tagsSatisfied)
				return true;
		}
		
		return false;
	},
	
	_getTableHierarchyFor: function(contentGr) {
		// We could expand to sibling extended tables by using
		// tableUtils.getAbsoluteBase() before calling getHierarchy()
		
		var tableUtils = new TableUtils(contentGr.getTableName());
		var tableHierarchy = tableUtils.getHierarchy();
		return GlideStringUtil.join(tableHierarchy);
	},
	
	_getTagsFor: function(contentGr, tableHierarchy) {
		var tagMap = {};
		var labelEntries = new GlideRecord('label_entry');
		labelEntries.addQuery('table', 'IN', tableHierarchy);
		labelEntries.addQuery('table_key', contentGr.getUniqueValue());
		labelEntries.query();
		while(labelEntries.next())
			tagMap[labelEntries.label] = true;
		
		return tagMap;
	},
	
	_hasRequiredLabelEntries: function(ruleGr, contentGr, tableHierarchy) {
		if (!ruleGr.resource || !ruleGr.resource.resource_tags)
			return true;
		
		this.tagMap = this.tagMap || this._getTagsFor(contentGr, tableHierarchy); //Memoize tag map
		var resourceTags = ruleGr.resource.resource_tags.split(',');
		for (var i = 0; i < resourceTags.length; i++) {
			if (!this.tagMap[resourceTags[i]])
				return false;
		}
		
		return true;
	},
	
    type: 'FlowDesignerContentFiltering'
};
```