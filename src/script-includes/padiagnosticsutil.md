---
title: "PADiagnosticsUtil"
id: "padiagnosticsutil"
---

API Name: sn_pa_diagnostics.PADiagnosticsUtil

```js
var PADiagnosticsUtil = Class.create();
PADiagnosticsUtil.prototype = {
	_CONSTANTS: new PADiagnosticsConstants(),
	initialize: function() {
	},

	/**
	 * Check if there is a missing related list for a record.
	 *
	 * @param srcTable
	 * @param relTable
	 * @param relField
	 * @param id
	 * @param srcEncodedQuery
	 * @param relEncodedQuery
	 *
	 * @return sys_ids
	 */
	checkMissingRelatedList: function(srcTable, relTable, relField, id, srcEncodedQuery, relEncodedQuery ) {
		var result = [];
		var srcGR =  new GlideRecord(srcTable);
		if (id)
			srcGR.addEncodedQuery('sys_idIN' + id);
		if (srcEncodedQuery)
			srcGR.addEncodedQuery(srcEncodedQuery);
		srcGR.query();
		while (srcGR.next()) {
			var relGR = new GlideRecord(relTable);
			if (relEncodedQuery)
				relGR.addEncodedQuery(relEncodedQuery);
			relGR.addQuery(relField, srcGR.sys_id.toString());
			if (this.isFieldExist(relTable, 'active')) {
				relGR.addQuery('active', true);
			}
			relGR.setLimit(1);
			relGR.query();
			if (!relGR.hasNext()) {
				result.push(srcGR.sys_id.toString());
			}
		}
		return result.join(',');
	},

	/**
	 * Check if the field exist in the table.
	 *
	 * @param table
	 * @param field
	 *
	 * @return true if the field exist
	 */
	isFieldExist: function(table, field) {
		var tableGR = new GlideRecord(table);
		return tableGR.isValidField(field);
	},

	/**
	 * Check if there is an active scheduled collection job
	 * for the indicator
	 *
	 * @param indicatorID
	 *
	 * @return true if there is a schedule
	 */
	isIndicatorScheduled: function(indicatorID) {
		var jobIndicator = new GlideRecord('pa_job_indicators');
		jobIndicator.addQuery('indicator', indicatorID);
		jobIndicator.addQuery('collect_indicator', true);
		jobIndicator.addActiveQuery();
		jobIndicator.query();
		while (jobIndicator.next()) {
			if (jobIndicator.job.active && jobIndicator.job.run_type != 'once' && jobIndicator.job.run_type != 'on_demand')
			return true;
		}
		return false;
	},

	/**
	 * Check if the reference field refers to a valid record. 
	 * Empty reference is considered valid reference.
	 *
	 * @param refTable
	 * @param refValue
	 *
	 * @return true if the reference is valid
	 */
	isValidReference: function(refTable, refValue) {
		if (gs.nil(refValue))
			return true;
		var rTable = new GlideRecord(refTable);
		return rTable.get(refValue);
	},

	/**
	 * Check if the table is a database view.
	 *
	 * @param table
	 *
	 * @return true if the table is a database view
	 */
	isDatabaseView: function(table) {
		var dbView = new GlideRecord('sys_db_view');
		dbView.addQuery('name', table);
		dbView.setLimit(1);
		dbView.query();
		return dbView.hasNext();
	},

	/**
	 * Check if the field exist in the database view.
	 *
	 * @param table
	 * @param field
	 *
	 * @return true if the field is valid
	 */
	isValidFieldDBView: function(table, field) {
		var dbView = new GlideRecord('sys_db_view');
		dbView.addQuery('name', table);
		dbView.query();
		if (!dbView.next()) {
			return false;
		}

		var dbViewTable = new GlideRecord('sys_db_view_table');
		dbViewTable.addQuery('view', dbView.getValue('sys_id'));
		dbViewTable.query();

		while(dbViewTable.next()) {
			var prefix = dbViewTable.variable_prefix.toString();
			if ((field.indexOf(prefix) == 0) && this.isValidField(dbViewTable.table, field.substring(prefix.length + 1))) {
				return true;
			}
		}
		return false;
	},

	/**
	 * Check if the field exist in the table including
	 * database views and dot-walked fields
	 * It does not validate inactive dictionary entries.
	 *
	 * @param table
	 * @param field
	 *
	 * @return true if the field is valid
	 */
	isValidField: function(table, field) {
		if (gs.nil(table) || gs.nil(field)) {
			return false;
		}

		var td = new GlideRecord(table);
		if (!td.isValid()) {
			return false;
		}

		var parts = field.split(".");

		//parse the dot-walked field if there is
		var tableName = table;
		for(var i=0; i<parts.length; i++) {
			if (this.isDatabaseView(tableName)) {
				return this.isValidFieldDBView(table, field);
			}

			if (!td.isValidField(parts[i])) {
				return false;
			}

			var ed = td.getElement(parts[i]);
			
			if (ed.getED().getInternalType() == 'reference') {
				td = ed.getRefRecord();
				if ((gs.nil(td)) || !td.isValid()) {
					return false;
				}
				tableName = td.getTableName();

			} else if (i != (parts.length-1)) { //if not the last element
				return false;
			}
		}
		return true;
	},

	/**
	 * Remove the comments from the Javascript.
	 *
	 * @param script
	 *
	 * @return script without any comments
	 */
	removeComments: function(script) {
		var commentRegEx = /((["'])(?:\\[\s\S]|.)*?\2|(?:[^\w\s]|^)\s*\/(?![*\/])(?:\\.|\[(?:\\.|.)\]|.)*?\/(?=[gmiy]{0,4}\s*(?![*\/])(?:\W|$)))|\/\/.*?$|\/\*[\s\S]*?\*\//gm;
		return script.replace(commentRegEx,'');
	},

	/**
	 * Condition validator.
	 *
	 * @param table
	 * @param condition
	 *
	 * @return true if the condition is valid
	 */
	isValidCondition: function(table, condition) {
		if (gs.nil(table)) {
			return false;
		}

		var validator = new GlideRecord(table);
		if (!validator.isValid()) {
			return false;
		}

		return PAScopedUtils.isEncodedQueryValid(table, condition);
	},

	/**
	 * Validate if the script includes insert/delete/update statement
	 *
	 * @param scriptValue
	 *
	 * @return true if the script doesn't include insert/update/delete statement
	 */
	 isScriptAllowed: function(scriptValue) {
		 if(gs.nil(scriptValue))
			 return true;

		 var script = this.removeComments(scriptValue);
		 var isScriptAllowed = (script.indexOf(this._CONSTANTS.INSERT) == -1) &&
			 (script.indexOf(this._CONSTANTS.UPDATE) === -1) &&
			 (script.indexOf(this._CONSTANTS.UPDATE_MULTIPLE) === -1) &&
			 (script.indexOf(this._CONSTANTS.DELETE_RECORD) === -1) &&
			 (script.indexOf(this._CONSTANTS.DELETE_MULTIPLE) === -1);
		 return isScriptAllowed;
	 },

	/**
	 * Validate if tableName is rotated table 
	 *
	 * @param tableName
	 *
	 * @return true if tableName is rotated
	 */
	 isRotatedTable: function(tableName) {
	 	if (!gs.tableExists(tableName))
	 		return false;
	 		
 		var grHierarchy = new GlideTableHierarchy(tableName);
 		var baseTable = grHierarchy.getRoot();
 		
 		var gr = new GlideRecord('sys_table_rotation');
		return gr.get('name', baseTable);
	},

	type: 'PADiagnosticsUtil'
};
```