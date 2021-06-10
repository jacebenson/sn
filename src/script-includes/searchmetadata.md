---
title: "SearchMetadata"
id: "searchmetadata"
---

API Name: sn_global_searchui.SearchMetadata

```js
var SearchMetadata = (function() {
	
	var getSearchGroups = function() {
		var groups = loadGroups();
		attachSearchedTables(groups);
		return groups;
	};
	
	var getShowGroupsUserPreference = function() {
		var perferenceName = 'ts.show_empty_groups';
		var showGroups = '';
		var userPreferenceTable = new GlideRecord("sys_user_preference");
		userPreferenceTable.addActiveQuery();
		userPreferenceTable.addQuery("name", perferenceName);
		userPreferenceTable.addQuery("user", gs.getUserID());
		userPreferenceTable.query();

		if (userPreferenceTable.next()) {
			showGroups = userPreferenceTable.getValue("value");
		} else {
			showGroups = gs.getUser().getPreference(perferenceName) || "true";
		}
		return showGroups;
	};

	var shouldHideResultsCount = function() {
		var hideResultsCount = '';
		var sysPropertiesTable = new GlideRecord("sys_properties");
		sysPropertiesTable.addQuery('name', 'sn_global_searchui.hide_results_count');
		sysPropertiesTable.query();
		while (sysPropertiesTable.next()) {
			hideResultsCount = sysPropertiesTable.getValue("value");
		}
		return hideResultsCount;
	};
	
	function loadGroups() {
		var tsGroup = new GlideRecord("ts_group");
		tsGroup.addActiveQuery();
		tsGroup.orderBy("order");
		tsGroup.addQuery("searched", true);
		tsGroup.query();
		
		var groups = [];
		while (tsGroup.next()) {
			if (gs.getUser().hasRole(tsGroup.getValue("roles") || '') &&
				(gs.nil(tsGroup.getValue("group")) ||
					gs.getUser().isMemberOf(tsGroup.getValue("group"))))
				groups.push({
					id: tsGroup.getValue("sys_id"),
					name : tsGroup.getDisplayValue("name"),
					description : tsGroup.getValue("description"),
					tables : []
				});
		}
		return groups;
	}
	
	function attachSearchedTables(groups) {
		var groupIds = groups.map(function(group) { return group.id; });
		var groupsBySysId = groups.reduce(function(memo, group, idx) {
			memo[group.id] = group;
			return memo;
		}, {});
		var tsTable = new GlideRecord("ts_table");
		tsTable.addActiveQuery();
		tsTable.addQuery("group", "IN", groupIds);
		tsTable.orderBy("group.order");
		tsTable.orderBy("order");
		tsTable.query();
		
		while (tsTable.next()) {
			var group = groupsBySysId[tsTable.getValue("group")];
			addTableToGroup(group, tsTable);
		}
	}
	
	function addTableToGroup(group, tsTable) {
		var tableName = tsTable.getDisplayValue("name");
		var tableGr = new GlideRecord(tableName); // Needed to check validity and get table label
		var tableLabel, tablePluralLabel, optionalLabel;
		
		if (!tableGr.isValid())
			return; // Skip invalid tables
		
		tableLabel = tableGr.getED().getLabel(); // Ew, but no access to TD in scope
		tablePluralLabel = tableGr.getED().getPlural();
		optionalLabel = tsTable.getDisplayValue("label");

		group.tables.push({
			id : tsTable.getUniqueValue(),
			name : tableName,
			label : tableLabel,
			label_plural : tablePluralLabel,
			optional_label : optionalLabel,
			conditionQuery : tsTable.getValue("condition"),
			conditions : tsTable.getDisplayValue("condition"), // not marked READABLE at present, so ugly
			searched : tsTable.getValue("searched") === "1"
		});
	}
	
	return {
		/**
		 * Get the search groups for the current user.
		 *
		 * Includes details about the group itself and the tables that comprise that group.
		 */
		getSearchGroups : getSearchGroups,
		getShowGroupsUserPreference: getShowGroupsUserPreference,
		shouldHideResultsCount: shouldHideResultsCount
	};
	
})();
```