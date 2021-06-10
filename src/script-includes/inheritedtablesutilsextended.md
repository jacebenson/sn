---
title: "InheritedTablesUtilsExtended"
id: "inheritedtablesutilsextended"
---

API Name: global.InheritedTablesUtilsExtended

```js
var InheritedTablesUtilsExtended = Class.create();
InheritedTablesUtilsExtended.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
	getInheritedTables: function() {
		var screenId = this.getParameter('sysparm_screen');
		var screenGR = new GlideRecord('sys_sg_screen');
		if (!screenGR.canRead())
			return;

		screenGR.get(screenId);
		if (!screenGR.isValidRecord())
			return;
		
		if (!screenGR.canRead())
			return;

		if (screenGR.sys_class_name == 'sys_sg_calendar_screen') {
			var result = [];
			var table_names = [];
			var calendarGR = new GlideRecord('sys_sg_calendar_data_source');
			if (!calendarGR.canRead())
				return;

			calendarGR.addQuery('screen', screenGR.sys_id);
			calendarGR.query();
			while (calendarGR.next()) {
				if (!calendarGR.canRead())
					continue;

				var dataItemGE = calendarGR.getElement("data_item");
				if (!dataItemGE.canRead())
					continue;
	
				var dataItemTableGE = calendarGR.getElement("data_item.table");
				if (!dataItemTableGE.canRead())
					continue;

				var table_name = calendarGR.data_item.table;
				if (table_names.indexof(table_name) >= 0)
					continue;

				table_names.push(table_name);
				var td = GlideTableDescriptor.get(table_name);
				var item = {};
				item.table_name = table_name.toString();
				item.label = td.getLabel();
				result.push(item);
			}
			return JSON.stringify(result);
		}

		if (screenGR.data_item == null)
			return;

		var screenDataItemGE = screenGR.getElement("data_item");
		if (!screenDataItemGE.canRead())
			return;

		var screenDataItemTableGE = screenGR.getElement("data_item.table");
		if (!screenDataItemTableGE.canRead())
			return;
		
		var table = screenGR.data_item.table;
		if (table == null)
			return;

		var inheritedTables = new InheritedTablesUtils();
		var inheritedTablesArr = inheritedTables.getInheritedTables(table);
		if (inheritedTablesArr == null)
			return;

		return JSON.stringify(inheritedTablesArr);
	},

	type: 'InheritedTablesUtilsExtended'
});

```