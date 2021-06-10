---
title: "ATFLeftNavUtil"
id: "atfleftnavutil"
---

API Name: global.ATFLeftNavUtil

```js
var ATFLeftNavUtil = Class.create();
ATFLeftNavUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	process: function() {
		var name = this.getParameter('sysparm_name');
		if (name == 'getNotVisibleModules')
			return this.getNotVisibleRecords('sys_app_module', this.getParameter('sysparm_visible_modules'));
		else if (name == 'getNotVisibleApplications')
			return this.getNotVisibleRecords('sys_app_application', this.getParameter('sysparm_visible_applications'));
	},

	/**
	 * Given a list of records that a user is able to see, returns
	 * a list of records that the user is not able to see.
	 * @param tableName - must have a 'title' column
	 * @param visibleRecords - comma-separated string of visible records
	 */
	getNotVisibleRecords: function(tableName, visibleRecords) {
		var result = [];
		if (!visibleRecords)
			return result;

		var gr = new GlideRecord(tableName);
		if (!gr.isValid()) {
			gs.log("Unable to find not-visible records, table is not valid: " + tableName);
			return result;
		}

		gr.addQuery('sys_id', 'NOT IN', visibleRecords);
		gr.query();
		while (gr.next()) {
			var title = gr.title ? gr.title + '' : gs.getMessage('(empty)');
			result.push({ id : gr.sys_id + '', title: title });
		}

		return JSON.stringify(result);
	},

	/**
	 * Given a table and array of sys_ids, returns an array of titles
	 */
	getTitles: function(tableName, idArr) {
		var titles = [];
		var gr = new GlideRecord(tableName);
		if (!gr.isValid()) {
			gs.warn("Table is not valid: " + tableName);
			return idArr;
		}

		for (var i = 0; i < idArr.length; i += 1) {
			gr.initialize();
			if (gr.get(idArr[i]))
				titles.push(gr.getDisplayValue('title') ? gr.getDisplayValue('title') : idArr[i]);
			else
				titles.push(idArr[i]);
		}

		return titles;
	},

    type: 'ATFLeftNavUtil'
});
```