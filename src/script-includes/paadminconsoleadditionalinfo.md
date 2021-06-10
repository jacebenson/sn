---
title: "PAAdminConsoleAdditionalInfo"
id: "paadminconsoleadditionalinfo"
---

API Name: global.PAAdminConsoleAdditionalInfo

```js
var PAAdminConsoleAdditionalInfo = Class.create();
PAAdminConsoleAdditionalInfo.prototype = {
	initialize: function() {
		var paAdminConsoleConstants = new PAAdminConsoleConstants();
		this._CONSTANTS = paAdminConsoleConstants;
		this._TABLES = paAdminConsoleConstants.TABLES;
		this.L10 = paAdminConsoleConstants.L10;
	},
	_getTooltipInfo: function (type, record) {
		var response = {};
		var _L10 = this.L10;
		var sourceTable;
		var gr;
		var grPa;
		var shared;
		var paAdminConsoleHelper = new PAAdminConsoleHelper();
		var NODE_TYPES = this._CONSTANTS.NODE_TYPES;

		switch (type) {
		case NODE_TYPES.INDICATOR:
			response = this._getToolTipForIndicator(response, _L10, record);
			break;
		case NODE_TYPES.INDICATOR_SOURCE:
			response[_L10.FREQUENCY] = record.getDisplayValue('frequency');
			response[_L10.FACT_TABLE] = record.getDisplayValue('facts_table');
			response[_L10.CONDITION] = record.getDisplayValue('conditions');
			break;
		case NODE_TYPES.WIDGET_INDICATOR:
			response = this._getTooltipForWidgetIndicator(response, _L10, record);
			break;
		case NODE_TYPES.BREAKDOWN:
			response[_L10.TYPE] = record.getDisplayValue('type');
			if (Number(record.getValue('type')) === 3)
				response[_L10.DATA_SOURCE] = record.getDisplayValue('data_source');
			break;
		case NODE_TYPES.BREAKDOWN_SOURCE:
			response[_L10.FIELD] = record.getDisplayValue('field');
			response[_L10.CONDITION] = record.getDisplayValue('conditions');
			break;
		case NODE_TYPES.DASHBOARD:
			response[_L10.OWNER] = record.getDisplayValue('owner.name');
			shared = this._getSharedInfoOfDashboard(record.getValue('sys_id'));
			response[_L10.USERS] = shared.users;
			response[_L10.GROUPS] = shared.groups;
			response[_L10.ROLES] = shared.roles;
			break;
		case NODE_TYPES.GROUP:
			response[_L10.VISIBLE_TO] = record.getDisplayValue('visible_to');
			if (Number(record.getValue('visible_to')) === 2)
				response[_L10.ROLES] = this._getRolesOfDashboradGroup(record.getValue('sys_id'));
			else if (Number(record.getValue('visible_to')) === 3) {
				response[_L10.GROUPS] = this._getGroups(record.getValue('groups'));
				response[_L10.USERS] = this._getUsers(record.getValue('users'));
			}
			break;
		case NODE_TYPES.FILTER:
		case NODE_TYPES.INTERACTIVE_FILTER:
			response[_L10.UI_CONTROL_TYPE] = record.getDisplayValue('ui_control_type');
			response[_L10.FILTER_BASED_ON] = record.getDisplayValue('type');
			if (record.getDisplayValue('allow_extended_table'))
				response[_L10.APPLY_TO_ALL_IN_HIERARCHY] = record.getDisplayValue('allow_extended_table');
			break;
		case NODE_TYPES.INDICATOR_JOBS:
			response = this._getTooltipForIndicatorJobs(grPa, record, response, _L10);
			break;
		case NODE_TYPES.REPORT:
			response[_L10.TABLE] = record.getDisplayValue('table');
			response[_L10.TYPE] = record.getDisplayValue('type');
			response[_L10.PUBLISHED] = record.getDisplayValue('is_published');
			break;
		case NODE_TYPES.REPORT_SOURCE:
			response[_L10.TABLE] = record.getDisplayValue('table');
			response[_L10.FILTER] = record.getDisplayValue('filter');
			break;
		case NODE_TYPES.SOURCE_TABLE:
			sourceTable = paAdminConsoleHelper._getTableDisplayName(record);
			if (sourceTable.type == 'table') {
				response[_L10.TYPE] = _L10.TABLE;
				response[_L10.IS_EXTENDABLE] = sourceTable.is_extendable;
			} else if (sourceTable.type == 'db_view')
				response[_L10.TYPE] = _L10.DATABASE_VIEW;
			break;
		case NODE_TYPES.SCRIPT:
			response[_L10.TABLE] = record.getDisplayValue('table');
			response[_L10.ARGUMENTS] = record.getDisplayValue('arguments');
			break;
		case NODE_TYPES.TAB:
			gr = new GlideRecord(this._TABLES.PA_TABS);
			gr.get(record);
			response[_L10.PAGE] = gr.getDisplayValue('page.title');
			break;
		case NODE_TYPES.CASCADING_FILTER:
			response = this._getTooltipForCaccadingFilter(sourceTable, paAdminConsoleHelper, record, response, _L10);
			break;
		default:
			break;
		}
		return response;
	},
	_getTooltipInfoForWidget: function (sysID, renderer, widget) {
		var response = {};
		var _L10 = this.L10;
		var sysReport;
		var sysGauge;
		var SUPPORTED_RENDERERS = this._CONSTANTS.SUPPORTED_RENDERERS;
		var paAdminConsoleHelper = new PAAdminConsoleHelper();
		if(renderer)
			renderer = JSON.parse(JSON.stringify(renderer));
		else
			return response;
		switch (renderer) {
		case SUPPORTED_RENDERERS.PERFORMANCE_ANALYTICS:
			response = this._getValueForPerformanceAnalytics(sysID, response, _L10, widget, paAdminConsoleHelper, renderer);
			break;
		case SUPPORTED_RENDERERS.DASHBOARD:
			sysGauge = new GlideRecord(this._TABLES.SYS_GAUGE);
			if (sysGauge.get(sysID))
				response[_L10.TYPE] = sysGauge.getDisplayValue('type');

			break;
		case SUPPORTED_RENDERERS.REPORT:
			sysReport = new GlideRecord(this._TABLES.SYS_REPORT);
			if (sysReport.get(sysID))
				response[_L10.TYPE] = sysReport.getDisplayValue('type');
			break;
		case SUPPORTED_RENDERERS.HOMEPAGE_PUBLISHERS:
			response = this._getValueForPublisher(sysID, response, widget);
			break;
		default:
			break;
		}
		return response;
	},
	_getRolesOfDashboradGroup: function (dashboardGrpID) {
		var roleNames = [];
		var gr = new GlideRecord(this._TABLES.PA_DASHBOARDS_GROUPROLES);
		gr.addQuery('parent_id', '=', dashboardGrpID);
		gr.query();
		while (gr.next())
			roleNames.push(gr.getDisplayValue('value'));
		return roleNames;
	},
	_getGroups: function (grpIDs) {
		var groups = [];
		var gr = new GlideRecord(this._TABLES.SYS_USER_GROUP);
		gr.addQuery('sys_id', 'IN', grpIDs);
		gr.query();
		while (gr.next())
			groups.push(gr.getDisplayValue('name'));
		return groups;
	},
	_getUsers: function (usrIDs) {
		var users = [];
		var gr = new GlideRecord(this._TABLES.SYS_USER);
		gr.addQuery('sys_id', 'IN', usrIDs);
		gr.query();
		while (gr.next())
			users.push(gr.getDisplayValue('name'));
		return users;
	},
	_getSharedInfoOfDashboard: function (dashboardID) {
		var gr = new GlideRecord(this._TABLES.PA_DASHBOARDS_PERMISSIONS);
		var res = {
			users: [],
			groups: [],
			roles: [],
		};
		gr.addQuery('dashboard', '=', dashboardID);
		gr.query();
		while (gr.next()) {
			if (gr.getDisplayValue('group.name'))
				res.groups.push(gr.getDisplayValue('group.name'));

			if (gr.getDisplayValue('user.name'))
				res.users.push(gr.getDisplayValue('user.name'));

			if (gr.getDisplayValue('role.name'))
				res.roles.push(gr.getDisplayValue('role.name'));
		}
		return res;
	},
	_getJobStatistics: function (job) {
		var stats = {};
		var log = new GlideRecord(this._TABLES.PA_JOB_LOGS);
		log.orderByDesc('completed');
		log.setLimit(1);
		log.addQuery('state', '!=', 'collecting');
		log.addQuery('job', job.getUniqueValue());
		log.query();
		if (log.next()) {
			stats.inserts = log.getDisplayValue('inserts');
			stats.updates = log.getDisplayValue('updates');
			stats.deletes = log.getDisplayValue('deletes');
			stats.errors = log.getDisplayValue('errors');
			stats.warnings = log.getDisplayValue('warnings');
			stats.state = log.getDisplayValue('state');
			stats.completed = log.getDisplayValue('completed');
		}
		return stats;
	},
	_getToolTipForIndicator: function(response, _L10, record) {
		var indicatorType;
		var formula;
		response[_L10.DIRECTION] = record.getDisplayValue('direction');
		response[_L10.UNIT] = record.getDisplayValue('unit');
		response[_L10.FREQUENCY] = record.getDisplayValue('frequency');
		response[_L10.TYPE] = record.getDisplayValue('type');
		indicatorType = Number(record.getValue('type'));
		if (indicatorType === 1) {
			response[_L10.AGGREGATE] = record.getDisplayValue('aggregate');
			response[_L10.FIELD] = record.getDisplayValue('field');
			response[_L10.FACT_TABLE] = record.getDisplayValue('cube.facts_table');
			response[_L10.SCRIPTED] = record.getDisplayValue('scripted');
		} else if (indicatorType === 2) {
			formula = new SNC.PAFormula(record.formula);
			if (formula.isValid())
				response[_L10.FORMULA] = formula.getDisplay();
		} else if (indicatorType === 4)
			response[_L10.DATA_SOURCE] = record.getDisplayValue('data_source');
		return response;
	},
	_getTooltipForCaccadingFilter: function(sourceTable, paAdminConsoleHelper, record, response, _L10) {
		sourceTable = paAdminConsoleHelper._getTableDisplayName(record.getDisplayValue('table'));
		if (sourceTable.type == 'table')
			response[_L10.TABLE] = sourceTable.name || '';
		else if (sourceTable.type == 'db_view')
			response[_L10.DATABASE_VIEW] = sourceTable.name || '';
		response[_L10.DISPLAY_FIELD] = record.getDisplayValue('display_field');
		if (record.getDisplayValue('parent') != null)
			response[_L10.PARENT_REFERENCE_FIELD] = record.getDisplayValue('cascading_filter_reference_field');
		return response;
	},
	_getTooltipForIndicatorJobs: function(grPa, record, response, _L10) {
		var lastJobStatistics;
		grPa = new GlideRecord(this._TABLES.SYSAUTO_PA);
		grPa.get(record.getValue('sys_id'));
		response[_L10.SCORE_OPERATOR] = grPa.getDisplayValue('score_operator');
		response[_L10.SCORE_RELATIVE_START] = grPa.getDisplayValue('score_relative_start');
		response[_L10.SCORE_RELATIVE_START_INTERVAL] = grPa.getDisplayValue('score_relative_start_interval');
		response[_L10.SCORE_RELATIVE_END] = grPa.getDisplayValue('score_relative_end');
		response[_L10.SCORE_RELATIVE_END_INTERVAL] = grPa.getDisplayValue('score_relative_end_interval');
		lastJobStatistics = this._getJobStatistics(record);
		response[_L10.INSERTS] = lastJobStatistics.inserts;
		response[_L10.UPDATES] = lastJobStatistics.updates;
		response[_L10.DELETES] = lastJobStatistics.deletes;
		response[_L10.ERRORS] = lastJobStatistics.errors;
		response[_L10.WARNINGS] = lastJobStatistics.warnings;
		response[_L10.STATE] = lastJobStatistics.state;
		response[_L10.COMPLETED] = lastJobStatistics.completed;
		return response;
	},
	_getTooltipForWidgetIndicator: function(response, _L10, record) {
		var label;
		var followedBreakdown;
		var followElement;
		var aggregate;
		var elementLevel2;
		var breakdownLevel2;
		var element;
		response[_L10.INDICATOR] = record.getDisplayValue('indicator');
		response[_L10.BREAKDOWN] = record.getDisplayValue('breakdown');
		element = record.getDisplayValue('element');
		if (element)
			response[_L10.ELEMENT] = element;
		breakdownLevel2 = record.getDisplayValue('breakdown_level2');
		if (breakdownLevel2)
			response[_L10.SECOND_BREAKDOWN] = breakdownLevel2;
		elementLevel2 = record.getDisplayValue('element_level2');
		if (elementLevel2)
			response[_L10.ELEMENT] = elementLevel2;
		aggregate = record.getDisplayValue('aggregate');
		if (aggregate)
			response[_L10.TIME_SERIES] = aggregate;
		followElement = record.getDisplayValue('follow_element');
		if (followElement)
			response[_L10.FOLLOW_ELEMENT] = followElement;
		followedBreakdown = record.getDisplayValue('followed_breakdown');
		if (followedBreakdown)
			response[_L10.FOLLOWED_BREAKDOWN] = followedBreakdown;
		label = record.getDisplayValue('label');
		if (label)
			response[_L10.LABEL] = label;
		return response;
	},
	_getValueForPublisher: function(sysID, response, widget) {
		var grCascFilter;
		var grDateFilter;
		var grGroupFilter;
		var grRefFilter;
		var filter;
		var filterType;
		filter = new GlideRecord(this._TABLES.SYS_UI_HP_PUBLISHER);
		if (filter.get(sysID)) {
			response = this._getTooltipInfo('interactive_filter', filter);
			filterType = Number(filter.getValue('type'));
			if (filterType === 2) {
				grRefFilter = new GlideRecord(this._TABLES.SYS_UI_HP_REFERENCE);
				grRefFilter.addQuery('publisher_reference', filter.getValue('sys_id'));
				grRefFilter.query();
				if (grRefFilter.getRowCount() == 0)
					widget.isLeafNode = true;
			} else if (filterType === 4) {
				grGroupFilter = new GlideRecord(this._TABLES.SYS_UI_HP_GROUP);
				grGroupFilter.addQuery('group_publisher', filter.getValue('sys_id'));
				grGroupFilter.query();
				if (grGroupFilter.getRowCount() == 0)
					widget.isLeafNode = true;
			} else if (filterType === 3) {
				grDateFilter = new GlideRecord(this._TABLES.SYS_UI_HP_DATE);
				grDateFilter.addQuery('publisher_reference', filter.getValue('sys_id'));
				grDateFilter.query();
				if (grDateFilter.getRowCount() == 0)
					widget.isLeafNode = true;
			} else if (filterType === 6) {
				grCascFilter = new GlideRecord(this._TABLES.SYS_UI_HP_CASCADING_FILTER);
				grCascFilter.get('publisher_reference', filter.getValue('sys_id'));
				grCascFilter.query();
				if (grCascFilter.getRowCount() == 0)
					widget.isLeafNode = true;
			}
		}
		return response;
	},
	_getValueForPerformanceAnalytics: function(sysID, response, _L10, widget, paAdminConsoleHelper, renderer) {
		var children;
		var paWidgets;
		paWidgets = new GlideRecord(this._TABLES.PA_WIDGETS);
		if (paWidgets.get(sysID)) {
			response[_L10.TYPE] = paWidgets.getDisplayValue('type');
			widget.widgetType = paWidgets.getValue('type');
			response[_L10.VISUALIZATION] = paWidgets.getDisplayValue('visualization');
			if (!widget._children) {
				children = paAdminConsoleHelper._getWidgetChildren(sysID, renderer, '');
				if (children.length === 0)
					widget.isLeafNode = true;
				widget._children = children;
			} else if (widget._children && widget._children.length === 0)
				widget.isLeafNode = true;
		}
		return response;
	},
	type: 'PAAdminConsoleAdditionalInfo',
};
```