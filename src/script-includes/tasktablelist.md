---
title: "TaskTableList"
id: "tasktablelist"
---

API Name: sn_templated_snip.TaskTableList

```js
var TaskTableList = Class.create();
TaskTableList.prototype = {
    initialize: function() {
    },
	
	/*
	* Utility script include that returns list of tables for which templated snippets can be created.
	*
	* @returns
	*   List of tables to create templated snippets.
	*/
	process: function() {
		var tableList = [];
		var isHRModule = gs.getUrlOnStack().contains('hrmodule');
		var pluginManager = new GlidePluginManager(); 
		var HRCoreActive = pluginManager.isActive('com.sn_hr_core');
		var LEActive = pluginManager.isActive('com.sn_hr_lifecycle_events');
		
		//Return HR tables
		if ( HRCoreActive && isHRModule ) 
			tableList = sn_hr_core.hr.TABLE_CASE_EXTENSIONS.concat(sn_hr_core.hr.TABLE_TASK_EXTENSIONS);
		//Return all task tables and interaction table
		else {
			//list of task tables
			var extensions = new GlideTableHierarchy("task").getAllExtensions();
			//list of interaction tables
			var interactionTables = new GlideTableHierarchy("interaction").getAllExtensions();

			tableList = extensions.concat(interactionTables);
		}
		
		//filter HR core tables for sn_hr_core.manager role
		return HRCoreActive? this._filterHRTables(tableList, LEActive) : tableList;
	},
	
	/*
	* @param: Array list of tables
	* 
	* @return: Filtered list of tables
	*   Filters array list of tables by removing
	*   1. HR tables if user does not have 'sn_hr_core.manager' role
	*   2. LE tables if user does not have 'sn_hr_le.admin' role
	*/
	_filterHRTables: function(tables, LEActive) {
		//Remove HR tables if user has no 'sn_hr_core.manager' role
		if( !gs.hasRole('sn_hr_core.manager') ) 
			//remove HR core tables
			tables = tables.filter( this._filterArrayFor('sn_hr_core') );
		
		//Remove LE tables if user has no 'sn_hr_le.admin' role
		if( LEActive && !gs.hasRole('sn_hr_le.admin') )
			tables = tables.filter( this._filterArrayFor('sn_hr_le') );
	
		return tables;
	},
	
	/*
	* @param:
	*   string: type string
	* @returns:
	*   function: a callback filter function that returns
	*      false: if array element contains string   
	*       true: if array element does not contain string
	*/
	_filterArrayFor: function(string) {
		return function(element) {
			return element.indexOf(string) == -1;
		};
	},
	
    type: 'TaskTableList'
};
```