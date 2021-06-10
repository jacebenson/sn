---
title: "omitCountHelperAjax"
id: "omitcounthelperajax"
---

API Name: global.omitCountHelperAjax

```js
var omitCountHelperAjax = Class.create();
omitCountHelperAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
    omitCountRegularListControl: function() {
		var listControl = this.getParameter('sysparm_listControl');
		var selectAll = this.getParameter('sysparm_selectAll');
		var tableName = this.getParameter('sysparm_table');
		var grListControl = new GlideRecordSecure('sys_ui_list_control');
		
		var recordExists = grListControl.get(listControl);

		if (selectAll == "true") {
			grListControl.setValue('omit_count', true);
			grListControl.setValue('omit_count_views', false);
			grListControl.setValue('omit_count_views_list', '');
			if (recordExists)
				grListControl.update();
			else {
				grListControl.setValue('name', tableName);
				grListControl.insert();
			}
		} else {
			var views = this.getParameter('sysparm_views');

			if (views) {
				grListControl.setValue('omit_count', true);
				grListControl.setValue('omit_count_views', true);
				grListControl.setValue('omit_count_views_list', views);
				if (recordExists)
					grListControl.update();
				else {
					grListControl.setValue('name', tableName);
					grListControl.insert();
				}
			} else {
				grListControl.setValue('omit_count', false);
				grListControl.setValue('omit_count_views', false);
				grListControl.setValue('omit_count_views_list', '');
				if (recordExists)
					grListControl.update();
				else {
					grListControl.setValue('name', tableName);
					grListControl.insert();
				}
			}
		}
	},

	omitCountRelatedListControl: function () {
		var jsonData = this.getParameter('sysparm_map');

		if (jsonData === null || jsonData === undefined)
			return;
		
		jsonData = JSON.parse(jsonData);

		for (var parentTable in jsonData) {
			if (jsonData.hasOwnProperty(parentTable)) {
				for (var relatedList in jsonData[parentTable]) {
					if (jsonData[parentTable].hasOwnProperty([relatedList])) {
						var grRelatedListControl = new GlideRecordSecure('sys_ui_list_control');
						grRelatedListControl.addQuery('name', parentTable);
						grRelatedListControl.addQuery('related_list', relatedList);
						grRelatedListControl.query();

						if (grRelatedListControl.next()) {
							grRelatedListControl.setValue('omit_count', jsonData[parentTable][relatedList]);
							grRelatedListControl.update();
						} else {
							grRelatedListControl.initialize();
							grRelatedListControl.setValue('name', parentTable);
							grRelatedListControl.setValue('related_list', relatedList);
							grRelatedListControl.setValue('omit_count', jsonData[parentTable][relatedList]);
							grRelatedListControl.insert();
						}
					}
				}
			}
		}
	},
	
	type: 'omitCountHelperAjax'
});
```