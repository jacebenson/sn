---
title: "AJAXManualPageInspector"
id: "ajaxmanualpageinspector"
---

API Name: global.AJAXManualPageInspector

```js
var AJAXManualPageInspector = Class.create();

AJAXManualPageInspector.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

	getUIPagesName : function(option) {
		var name = unescape(option.name.toString()).toLowerCase().trim(),
			limit = option.limit,
			offset = option.offset,
			totalRecords,
			data = [];

		var gr = new GlideRecordSecure("sys_ui_page");
		gr.addQuery("name", "CONTAINS", name);
		gr.chooseWindow(offset, offset+limit);
		gr.orderBy('name');
		gr.query();
		totalRecords  = gr.getRowCount();
		while (gr.next()) {
			data.push({
				name :  "ui_page.do?sys_id="+gr.getValue("sys_id"),
				label : gr.getValue("name")
			});
		}

		return { data:data, totalRecords:totalRecords};
	},

	getAppPageNames : function(){
		var pages = {
			portals: [],
			portalPages:[]
		};

		var elem = null;
		// check if sp_page and sp_portal tables exist
		var gr = new GlideRecordSecure('sp_page');
		if (gr.isValid()) {
			gr.orderBy('title');
			gr.query();

			while(gr.next()) {
				elem = {
					title: gr.title.toString(),
					id: gr.id.toString(),
					sys_id: gr.sys_id.toString()
				};
				pages.portalPages.push(elem);
			}
		}

		gr = new GlideRecordSecure('sp_portal');
		if (gr.isValid()) {
			gr.orderBy('title');
			gr.query();

			while (gr.next()) {
				elem = {
					title: gr.title.toString(),
					url_suffix: gr.url_suffix.toString(),
					sys_id: gr.sys_id.toString()
				};
				pages.portals.push(elem);
			}
		}

		var allPages =  new global.JSON().encode(pages);
		return allPages;
	},

	getRecordsForTable: function() {
		var data = [];
		var tableName = this.getParameter('sysparm_table');
		if (!tableName)
			return JSON.stringify({});

		var gr = new GlideRecordSecure(tableName);
		gr.query();
		while (gr.next()) {
			data.push({
				name: gr.getDisplayValue(),
				id: gr.getValue('sys_id')
			});
		}

		return JSON.stringify(data);
	},

    type: 'AJAXManualPageInspector'
});
```