---
title: "PAAdminConsoleIFilterHelper"
id: "paadminconsoleifilterhelper"
---

API Name: global.PAAdminConsoleIFilterHelper

```js
var PAAdminConsoleIFilterHelper = Class.create();
PAAdminConsoleIFilterHelper.prototype = {
	initialize: function() {
		var paAdminConsoleConstants = new PAAdminConsoleConstants();
		this._CONSTANTS = paAdminConsoleConstants;
		this._TABLES = paAdminConsoleConstants.TABLES;
		this._NODE_TYPES = paAdminConsoleConstants.NODE_TYPES;
		this.paAdminConsoleAdditionalInfo = new PAAdminConsoleAdditionalInfo();
	},
	_getWidgetsDetailsForFilter: function (id) {
		var filterRecord = this._getInteractiveFilterRecord(id);
		var filter = this._getInteractiveFilterDetails(filterRecord);
		var children = this._getIFChildren(filterRecord);
		if (filter) {
			if (children.length)
				filter._children = children;
			else
				filter.isLeafNode = true;
			return [filter];
		}
		return null;
	},
	_getInteractiveFilterRecord: function (id) {
		var filter = new GlideRecord(this._TABLES.SYS_UI_HP_PUBLISHER);
		if (filter.get(id))
			return filter;
		return null;
	},
	_getInteractiveFilterDetails: function (filter) {
		var record;
		if (filter)
			record = {
				id: filter.getValue('sys_id'),
				name: gs.getMessage(filter.getDisplayValue('name') || ''),
				look_up_name: filter.getValue('look_up_name'),
				type: this._NODE_TYPES.INTERACTIVE_FILTER,
				uuid: gs.generateGUID(),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.INTERACTIVE_FILTER, filter),
			};

		return record;
	},
	_getIFChildren: function (filterRecord) {
		if (!filterRecord)
			return {};
		var type = filterRecord.getValue('type');
		var sourceTable = null;
		var response = {};
		var paAdminConsoleHelper = new PAAdminConsoleHelper();
		response.type = this._NODE_TYPES.SOURCE_TABLE;
		switch (type) {
		case '1': { // choice list
			response.id = filterRecord.getDisplayValue(this._NODE_TYPES.SOURCE_TABLE);
			response.uuid = gs.generateGUID();
			if (response.id) {
				sourceTable = paAdminConsoleHelper._getTableDisplayName(response.id);
				response.name = sourceTable.name;
				response.sourceTableType = sourceTable.type;
			}
			response.isLeafNode = true;
			response.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, filterRecord.getDisplayValue(this._NODE_TYPES.SOURCE_TABLE));
			return [response];
		}
		case '2': { // reference
			return this._getReferenceFilterTables(filterRecord);
		}
		case '3': { // date
			return this._getDateFilterTables(filterRecord);
		}
		case '4': { // group
			return this._getGroupFilters(filterRecord);
		}
		case '5': { // boolean
			response.id = filterRecord.getDisplayValue('boolean_table');
			response.uuid = gs.generateGUID();
			if (response.id) {
				sourceTable = paAdminConsoleHelper._getTableDisplayName(response.id);
				response.name = sourceTable.name;
				response.sourceTableType = sourceTable.type;
			}
			response.isLeafNode = true;
			response.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, filterRecord.getDisplayValue('boolean_table'));
			return [response];
		}
		case '6': { // cascading
			return this._getCascadingFilters(filterRecord);
		}
		default: {
			response.type = 'default';
		}
		}
		return [response];
	},
	_getReferenceFilterTables: function (filterRecord) {
		var response = [];
		var record;
		var sourceTable = null;
		var grRefFilter = new GlideRecord(this._TABLES.SYS_UI_HP_REFERENCE);
		var paAdminConsoleHelper = new PAAdminConsoleHelper();
		grRefFilter.addQuery('publisher_reference', filterRecord.getValue('sys_id'));
		grRefFilter.query();
		while (grRefFilter.next()) {
			record = {};
			sourceTable = paAdminConsoleHelper._getTableDisplayName(grRefFilter.getValue('reference_table'));
			record.name = sourceTable.name;
			record.sourceTableType = sourceTable.type;
			record.id = grRefFilter.getValue('reference_table');
			record.type = this._NODE_TYPES.SOURCE_TABLE;
			record.isLeafNode = true;
			record.uuid = gs.generateGUID();
			record.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, grRefFilter.getValue('reference_table'));
			response.push(record);
		}
		return response;
	},
	_getDateFilterTables: function (filterRecord) {
		var response = [];
		var record;
		var sourceTable;
		var grRefFilter = new GlideRecord(this._TABLES.SYS_UI_HP_DATE);
		var paAdminConsoleHelper = new PAAdminConsoleHelper();
		grRefFilter.addQuery('publisher_reference', filterRecord.getValue('sys_id'));
		grRefFilter.query();
		while (grRefFilter.next()) {
			record = {};
			sourceTable = paAdminConsoleHelper._getTableDisplayName(grRefFilter.getValue('date_table'));
			record.name = sourceTable.name;
			record.sourceTableType = sourceTable.type;
			record.id = grRefFilter.getValue('date_table');
			record.type = this._NODE_TYPES.SOURCE_TABLE;
			record.isLeafNode = true;
			record.uuid = gs.generateGUID();
			record.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, grRefFilter.getValue('date_table'));
			response.push(record);
		}
		return response;
	},
	_getGroupFilters: function (filterRecord) {
		var response = [];
		var filterRec;
		var filter;
		var grRefFilter = new GlideRecord(this._TABLES.SYS_UI_HP_GROUP);
		grRefFilter.addQuery('group_publisher', filterRecord.getValue('sys_id'));
		grRefFilter.query();
		while (grRefFilter.next()) {
			filterRec = this._getInteractiveFilterRecord(grRefFilter.getValue('child_publisher'));
			filter = this._getInteractiveFilterDetails(filterRec);
			filter._children = this._getIFChildren(filterRec);
			if (filter._children.length === 0)
				filter.isLeafNode = true;
			response.push(filter);
		}
		return response;
	},
	_nextCascadingFilter: function (sysID) {
		var res = [];
		var obj = {};
		var grCascFilter = new GlideRecord(this._TABLES.SYS_UI_HP_CASCADING_FILTER);
		grCascFilter.get('parent', sysID);
		if (grCascFilter.isValidRecord()) {
			obj = {};
			obj = this._getCascadingFilterRecord(grCascFilter);
			obj._children = this._nextCascadingFilter(grCascFilter.getValue('sys_id'));
			this._fetchFilterTargetDetails(grCascFilter.getValue('sys_id'), obj._children);
			if (obj._children.length === 0)
				obj.isLeafNode = true;
			res.push(obj);
		}
		return res;
	},
	_getCascadingFilters: function (filterRecord) {
		var obj = {};
		var response = [];
		var grCascFilter = new GlideRecord(this._TABLES.SYS_UI_HP_CASCADING_FILTER);
		grCascFilter.get('publisher_reference', filterRecord.getValue('sys_id'));
		if (grCascFilter.isValidRecord()) {
			obj = {};
			obj = this._getCascadingFilterRecord(grCascFilter);
			obj._children = this._nextCascadingFilter(grCascFilter.getValue('sys_id'));
			this._fetchFilterTargetDetails(grCascFilter.getValue('sys_id'), obj._children);
			if (obj._children.length === 0)
				obj.isLeafNode = true;
			response.push(obj);
		}
		return response;
	},
	_getCascadingFilterRecord: function (record) {
		var response = {};
		response.id = record.getValue('sys_id');
		response.name = record.getValue('name');
		response.uuid = gs.generateGUID();
		response.type = this._NODE_TYPES.CASCADING_FILTER;
		response.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.CASCADING_FILTER, record);
		return response;
	},
	_fetchFilterTargetDetails: function (sysID, response) {
		var obj;
		var sourceTable;
		var grTargetTable = new GlideRecord(this._TABLES.SYS_UI_HP_CASCADING_FILTER_TARGET_REFERENCES);
		var paAdminConsoleHelper = new PAAdminConsoleHelper();
		grTargetTable.addQuery(this._NODE_TYPES.CASCADING_FILTER, sysID);
		grTargetTable.query();
		while (grTargetTable.next()) {
			obj = {};
			sourceTable = paAdminConsoleHelper._getTableDisplayName(grTargetTable.getValue('target_table'));
			obj.id = grTargetTable.getValue('target_table');
			obj.name = sourceTable.name;
			obj.sourceTableType = sourceTable.type;
			obj.uuid = gs.generateGUID();
			obj.type = this._NODE_TYPES.SOURCE_TABLE;
			obj.isLeafNode = true;
			obj.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, grTargetTable.getValue('target_table'));
			response.push(obj);
		}
	},
	type: 'PAAdminConsoleIFilterHelper',
};

```