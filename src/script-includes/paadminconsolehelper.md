---
title: "PAAdminConsoleHelper"
id: "paadminconsolehelper"
---

API Name: global.PAAdminConsoleHelper

```js
var PAAdminConsoleHelper = Class.create();
PAAdminConsoleHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	initialize: function (request, responseXML, gc) {
		var paAdminConsoleConstants = new PAAdminConsoleConstants();
		AbstractAjaxProcessor.prototype.initialize.call(this, request, responseXML, gc);
		this._CONSTANTS = paAdminConsoleConstants;
		this._TABLES = paAdminConsoleConstants.TABLES;
		this._NODE_TYPES = paAdminConsoleConstants.NODE_TYPES;
		this._TABLE_API = paAdminConsoleConstants.TABLE_API;
		this._CURRENT_SCOPE = paAdminConsoleConstants.CURRENT_SCOPE;
		this.paAdminConsoleAdditionalInfo = new PAAdminConsoleAdditionalInfo();
	},
	_isRendererSupported: function (renderer) {
		var supportedRenderer = this._CONSTANTS.SUPPORTED_RENDERERS;
		var isSupported = false;
		var key;
		for (key in supportedRenderer)
			if (supportedRenderer.hasOwnProperty(key) && supportedRenderer[key] == renderer)
				isSupported = true;
		return isSupported;
	},
	_getDashboardInfo: function (sysID) {
		var response = {};
		var grDashboard = new GlideRecordSecure(this._TABLES.PA_DASHBOARDS);
		grDashboard.get(sysID);
		if (grDashboard.isValidRecord()) {
			response.id = grDashboard.getUniqueValue();
			response.name = grDashboard.getDisplayValue('name');
			response.uuid = gs.generateGUID();
			response.type = this._NODE_TYPES.DASHBOARD;
			response.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.DASHBOARD, grDashboard);
		}
		return response;
	},
	_getTabInfo: function (sysID) {
		var response = {};
		var grTabs = new GlideRecordSecure(this._TABLES.PA_M2M_DASHBOARD_TABS);
		grTabs.get('tab', sysID);
		if (grTabs.isValidRecord())
			response = {
				id: grTabs.getUniqueValue(),
				name: grTabs.getDisplayValue('tab'),
				uuid: gs.generateGUID(),
				type: this._NODE_TYPES.TAB,
				tabUniqueId: grTabs.getDisplayValue('tab.sys_id'),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.TAB, grTabs.getDisplayValue('tab.sys_id')),
			};
		return response;
	},
    _getTabIdsForDashboard: function (dashboardIds) {
        var tabIds = [];
        var tabsGR = null;
		var validDashboardIDs = [];
		var dashboardGR = new GlideRecord(this._TABLES.PA_DASHBOARDS);
		dashboardGR.addQuery('sys_id', 'IN', dashboardIds);
		dashboardGR.query();
		while (dashboardGR.next())
			validDashboardIDs.push(dashboardGR.getUniqueValue());
		
		if (validDashboardIDs.length) {
			tabsGR = new GlideRecord(this._TABLES.PA_M2M_DASHBOARD_TABS);
			tabsGR.addQuery('dashboard', 'IN', validDashboardIDs.join(","));
			tabsGR.query();
			while (tabsGR.next())
				tabIds.push(tabsGR.getValue('tab'));
		}

        return tabIds;
    },
	_getTabIdsForGroups: function (groupIds) {
		var tabIds = [];
		var dashboardGR = null;
		var validDashboardGroupIDs = [];
		var dashboardGroupGR = new GlideRecord(this._TABLES.PA_DASHBOARDS_GROUP);
		dashboardGroupGR.addQuery('sys_id', 'IN', groupIds);
		dashboardGroupGR.query();
		while (dashboardGroupGR.next())
			validDashboardGroupIDs.push(dashboardGroupGR.getUniqueValue());
		
		if (validDashboardGroupIDs.length) {
			dashboardGR = new GlideRecord(this._TABLES.PA_DASHBOARDS);
			dashboardGR.addQuery('group', 'IN', validDashboardGroupIDs.join(","));
			dashboardGR.query();
			while (dashboardGR.next())
				tabIds = tabIds.concat(this._getTabIdsForDashboard(dashboardGR.getValue('sys_id')));	
			}
		return tabIds;
	},
	_getTabIds: function (filterTable, filterTableId) {
		var tabIds = [];
		if (filterTable == this._TABLES.PA_DASHBOARDS_GROUP)
			return this._getTabIdsForGroups(filterTableId);
		else if (filterTable == this._TABLES.PA_DASHBOARDS)
			return this._getTabIdsForDashboard(filterTableId);
		return tabIds.push(filterTableId);
	},
	_getGridCanvasId: function (tab, tabId) {
		var sysPortalPageId = tab.getValue('page');
		var sysGridCanvasId = tab.getValue('canvas_page');
		var canvasPage = null;
		var layoutLoader = null;
		if (sysGridCanvasId == null) {
			canvasPage = new GlideRecord(this._TABLES.SYS_GRID_CANVAS);
			canvasPage.addQuery('legacy_page', sysPortalPageId);
			canvasPage.query();
			if (canvasPage.next())
				sysGridCanvasId = canvasPage.getUniqueValue();
			else {
				layoutLoader = new SNC.LayoutLoader();
				layoutLoader.convertToCanvas(sysPortalPageId);
				tab.get(tabId);
				sysGridCanvasId = tab.getValue('canvas_page');
			}
		}
		return sysGridCanvasId;
	},
	_getWidgetFromPortal: function (portal) {
		var widget = {};
		var portalPreferenceName = null;
		var children = null;
		var portalPreference = new GlideRecord(this._TABLES.SYS_PORTAL_PREFERENCES);
		portalPreference.addQuery('portal_section', portal.getValue('sys_id'));
		portalPreference.query();
		while (portalPreference.next()) {
			portalPreferenceName = portalPreference.getValue('name');
			if (portalPreferenceName == 'sys_id')
				widget.id = portalPreference.getValue('value');
			if (portalPreferenceName == 'renderer')
				widget.renderer = portalPreference.getValue('value');
			if (portalPreferenceName == 'title')
				widget.name = gs.getMessage(portalPreference.getDisplayValue('value')|| '');
		}
		
		if (widget.id < 0)
			return widget;
		widget.type = this._NODE_TYPES.WIDGET;
		widget.uuid = gs.generateGUID();
		widget.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfoForWidget(widget.id, widget.renderer, widget);
		if (this._isRendererSupported(widget.renderer)) {
			children = this._getWidgetChildren(widget.id, widget.renderer, '');
			if (children && children.length) {
				widget._children = children;
				return widget;
			} 
			widget.isLeafNode = true;
			return widget;
		} else if (!this._isRendererSupported(widget.renderer))
			widget.isLeafNode = true;
		return widget;
	},
	_getWidgetsForaTab: function (tabSysId, isEmptyCheck) {
		var widgets = [];
		var tab = null;
		var tabId = null;
		var sysGridCanvasId = null;
		var canvasPane = null;
		var portal = null;
		var reponse = null;
		var dashboard = new GlideRecord(this._TABLES.PA_M2M_DASHBOARD_TABS);

		if (dashboard.get('tab', tabSysId)) {
			tabId = dashboard.getValue('tab');
			tab = new GlideRecord(this._TABLES.PA_TABS);
			if (tab.get(tabId)) {
				sysGridCanvasId = this._getGridCanvasId(tab, tabId);
				canvasPane = new GlideRecord(this._TABLES.SYS_GRID_CANVAS_PANE);
				canvasPane.addQuery('grid_canvas', sysGridCanvasId);
				canvasPane.query();
				while (canvasPane.next()) {
					portal = new GlideRecord(this._TABLES.SYS_PORTAL);
					portal.addQuery('sys_id', canvasPane.getValue('portal_widget'));
					portal.query();
					if (portal.next()) {
						reponse = this._getWidgetFromPortal(portal);
						if (reponse) {
							if (isEmptyCheck)
								return false;
							widgets.push(reponse);
						}
					}
				}
			}
		}
		if (isEmptyCheck && widgets.length === 0)
			return true;
		return widgets;
	},
	_getWidgets: function (filterTable, filterTableId) {
		var self = this;
		var tabIds = null;
		var widgets = [];
		if (filterTableId && filterTableId !== '' &&
			(filterTable == this._TABLES.PA_DASHBOARDS_GROUP || filterTable == this._TABLES.PA_DASHBOARDS || filterTable == this._TABLES.PA_M2M_DASHBOARD_TABS)) {
			tabIds = self._getTabIds(filterTable, filterTableId);
			tabIds.forEach(function (tabId) {
				widgets = widgets.concat(self._getWidgetsForaTab(tabId));
			});
		}
		return widgets;
	},
	_getWidgetPortal: function (renderer, sysID) {
		var valueQry = null;
		var count = new GlideAggregate(this._TABLES.SYS_PORTAL_PREFERENCES);
		var nameQry = count.addQuery('name', 'renderer');
		nameQry.addOrCondition('name', 'sys_id');
		valueQry = count.addQuery('value', renderer);
		valueQry.addOrCondition('value', sysID);
		count.addAggregate('COUNT');
		count.groupBy('portal_section');
		count.query();
		while (count.next())
			if (Number(count.getAggregate('COUNT')) === 2)
				return count.getValue('portal_section');
		return false;
	},
	_getWidgetInfo: function (portalSysID) {
		var widget = {};
		var portalPreferenceName = null;
		var portalPreference = new GlideRecord(this._TABLES.SYS_PORTAL_PREFERENCES);
		portalPreference.addQuery('portal_section', portalSysID);
		portalPreference.query();
		while (portalPreference.next()) {
			portalPreferenceName = portalPreference.getValue('name');
			if (portalPreferenceName == 'sys_id')
				widget.id = portalPreference.getValue('value');
			if (portalPreferenceName == 'renderer')
				widget.renderer = portalPreference.getValue('value');
			if (portalPreferenceName == 'title')
				widget.name = portalPreference.getDisplayValue('value');
		}
		widget.type = this._NODE_TYPES.WIDGET;
		widget.uuid = gs.generateGUID();
		widget.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfoForWidget(widget.id, widget.renderer, widget);
		return widget;
	},
	_getWidgetInfoFromTable: function (id, renderer) {
		var widget = {
			id: id,
			renderer: renderer,
			type: this._NODE_TYPES.WIDGET,
			uuid: gs.generateGUID(),
		};
		var glideRecord;
		var tableName;
		var fieldName = 'name';
		renderer = JSON.parse(JSON.stringify(renderer));
		if (renderer == this._CONSTANTS.SUPPORTED_RENDERERS.PERFORMANCE_ANALYTICS)
            tableName = this._TABLES.PA_WIDGETS;
        else if (renderer == this._CONSTANTS.SUPPORTED_RENDERERS.HOMEPAGE_PUBLISHERS)
            tableName = this._TABLES.SYS_UI_HP_PUBLISHER;
        else if (renderer == this._CONSTANTS.SUPPORTED_RENDERERS.REPORT) {
            tableName = this._TABLES.SYS_REPORT;
			fieldName = 'title';
		}
		if (tableName) {
			glideRecord = new GlideRecord(tableName);
			glideRecord.addQuery('sys_id', id);
			glideRecord.query();
			if (glideRecord.next()) {
				widget.name = glideRecord.getDisplayValue(fieldName);
				if (renderer == this._CONSTANTS.SUPPORTED_RENDERERS.PERFORMANCE_ANALYTICS)
					widget.widgetType = glideRecord.getValue('type');
			}
			widget.type = this._NODE_TYPES.WIDGET;
			widget.uuid = gs.generateGUID();
			widget.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfoForWidget(widget.id, widget.renderer, widget);
		}
		return widget;
	},
	_getWidgetChildren: function (id, renderer, recordType) {
		var children = [];
		var sysGauge;
		var report;
		var SUPPORTED_RENDERERS = this._CONSTANTS.SUPPORTED_RENDERERS;
		var paAdminConsoleIFilter = null;
		renderer = JSON.parse(JSON.stringify(renderer)); // Fix the renderer if passed as query param
		switch (renderer) {
		case SUPPORTED_RENDERERS.PERFORMANCE_ANALYTICS:
			children = this._handlePerformanceAnalytics(recordType, id, children);
			break;
		case SUPPORTED_RENDERERS.DASHBOARD:
			sysGauge = new GlideRecord(this._TABLES.SYS_GAUGE);
			if ((recordType == '' || recordType == this._NODE_TYPES.REPORT) && sysGauge.get(id)) {
				report = sysGauge.getValue(this._NODE_TYPES.REPORT);
				children = children.concat(this._getWidgetsDetailsForReport(report));
			}
			break;
		case SUPPORTED_RENDERERS.REPORT:
			if ((recordType == '' || recordType == this._NODE_TYPES.REPORT))
				children = children.concat(this._getWidgetsDetailsForReport(id));
			break;
		case SUPPORTED_RENDERERS.HOMEPAGE_PUBLISHERS:
			paAdminConsoleIFilter = new PAAdminConsoleIFilterHelper();
			if ((recordType == '' || recordType == this._NODE_TYPES.INTERACTIVE_FILTER))
				children = children.concat(paAdminConsoleIFilter._getWidgetsDetailsForFilter(id));
			break;
		default:
			break;
		}
		return children;
	},
	_getRecordsFromType: function (Objects, type) {
		var self = this;
		var records = [];
		Objects.forEach(function (obj) {
			if (obj.children)
				records = records.concat(self._getRecordsFromType(obj.children, type));
			else if (obj._children)
				records = records.concat(self._getRecordsFromType(obj._children, type));
			if (obj.type == type)
				records.push({
					id: obj.id,
					name: obj.name,
					type: obj.type,
					uuid: gs.generateGUID(),
				});
		});
		return records;
	},
	_getTableDisplayName: function (tblName) {
		var gr = new GlideRecord(this._TABLES.SYS_DB_OBJECT);
		var returnObj = {
			name: '',
			type: 'table',
		};
		gr.get('name', tblName);
		if (gr.isValidRecord()) {
			returnObj.name = gr.getDisplayValue('label');
			returnObj.is_extendable = gr.getDisplayValue('is_extendable');
		} else {
			gr = new GlideRecord(this._TABLES.SYS_DB_VIEW);
			gr.get('name', tblName);
			if (gr.isValidRecord()) {
				returnObj.name = gr.getDisplayValue('label');
				returnObj.type = 'db_view';
			}
		}
		return returnObj;
	},
	_getReportSource: function(reportSourceSysID, reportSourceRecord) {
		var childrenLabel = reportSourceSysID ? 'children' : '_children';
		if(reportSourceSysID) {
			reportSourceRecord = new GlideRecord(this._TABLES.SYS_REPORT_SOURCE);
			reportSourceRecord.get(reportSourceSysID);
		}
		var reportSource = {};
		if(reportSourceRecord.isValidRecord()) {
			reportSource.id = reportSourceRecord.getUniqueValue();
			reportSource.name = reportSourceRecord.getDisplayValue('display');
			reportSource.uuid = gs.generateGUID();
			reportSource.type = this._NODE_TYPES.REPORT_SOURCE;
			reportSource.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.REPORT_SOURCE, reportSourceRecord);
			tableData = this._getTableDisplayName(reportSourceRecord.getValue('table'));
			reportSource[childrenLabel] = [{
				id: reportSourceRecord.getValue('table'),
				name: tableData.name,
				sourceTableType: tableData.type,
				type: this._NODE_TYPES.SOURCE_TABLE,
				uuid: gs.generateGUID(),
				isLeafNode: true,
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, reportSourceRecord.getValue('table')),
			}];
		}
		return reportSource;		
	},
	_getWidgetsDetailsForReport: function (id, isCallFromReport) {
		var children = [];
		var sysReportSourceR;
		var reportSourceR;
		var record;
		var sysGauge;
		var sourceTable;
		var childrenLabel = isCallFromReport ? 'children' : '_children';
		var sysReport = new GlideRecord(this._TABLES.SYS_REPORT);
		if (sysReport.get(id)) {
			sysReportSourceR = new GlideRecord(this._TABLES.SYS_REPORT_SOURCE);
			reportSourceR = sysReport.getValue(this._NODE_TYPES.REPORT_SOURCE);
			record = {
				id: id,
				name: gs.getMessage(sysReport.getDisplayValue('title') || ''),
				type: this._NODE_TYPES.REPORT,
				uuid: gs.generateGUID(),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.REPORT, sysReport),
			};
			if (reportSourceR && sysReportSourceR.get(reportSourceR)) {
				record[childrenLabel] = [this._getReportSource(null, sysReportSourceR)];
			} else {
				sourceTable = this._getTableDisplayName(sysReport.getValue('table'));
				record[childrenLabel] = [{
					id: sysReport.getValue('table'),
					name: sourceTable.name,
					sourceTableType: sourceTable.type,
					type: this._NODE_TYPES.SOURCE_TABLE,
					uuid: gs.generateGUID(),
					isLeafNode: true,
					tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, sysReport.getValue('table')),
				}];
			}
			children = [record];
		} else {
			sysGauge = new GlideRecord(this._TABLES.SYS_GAUGE);
			if (sysGauge.get(id))
				return this._getWidgetsDetailsForReport(sysGauge.getValue(this._NODE_TYPES.REPORT), true);
		}
		return children;
	},
	_getBreakDownDetails: function (paBreakdowns, breakdown, recordType, isCallFromBreakdown) {
		var childrenLabel = isCallFromBreakdown ? 'children' : '_children';
		var paDimensions = new GlideRecord(this._TABLES.PA_DIMENSIONS);
		var dimension = paBreakdowns.getValue('dimension');
		var record = {
			id: paBreakdowns.getValue('sys_id'),
			name: paBreakdowns.getDisplayValue('name'),
			type: this._NODE_TYPES.BREAKDOWN,
			uuid: gs.generateGUID(),
			breakdownType: paBreakdowns.getValue('type'),
			data_source: paBreakdowns.getValue('data_source'),
			tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.BREAKDOWN, paBreakdowns),
			isLeafNode: !dimension,
		};
		var sourceTable;
		var children;
		if ((recordType == '' || recordType == this._NODE_TYPES.BREAKDOWN_SOURCE) && dimension && paDimensions.get(dimension)) {
			sourceTable = this._getTableDisplayName(paDimensions.getValue('facts_table'));
			record[childrenLabel] = [{
				id: dimension,
				name: paDimensions.getDisplayValue('name'),
				type: this._NODE_TYPES.BREAKDOWN_SOURCE,
				uuid: gs.generateGUID(),
				_children: [{
					id: paDimensions.getValue('facts_table'),
					name: sourceTable.name,
					sourceTableType: sourceTable.type,
					type: this._NODE_TYPES.SOURCE_TABLE,
					isLeafNode: true,
					uuid: gs.generateGUID(),
					tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, paDimensions.getValue('facts_table')),
				}],
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.BREAKDOWN_SOURCE, paDimensions),
				facts_table: paDimensions.getDisplayValue('facts_table'),
			}];
		}
		if (dimension && !paDimensions.get(dimension))
			record.isLeafNode = true;
		children = [record];
		return children;
	},
	_getIndicatorSourceDetails: function (paIndicator, recordType, isCallFromIndicatorSource) {
		var children = [];
		var childrenLabel = isCallFromIndicatorSource ? 'children' : '_children';
		var paCubes = new GlideRecord(this._TABLES.PA_INDICATOR_SOURCE);
		var cube = isCallFromIndicatorSource ? paIndicator : paIndicator.getValue('cube');
		var sysReportSource;
		var reportSource;
		var record;
		var sourceTable;
		var childrenNodes;
		if ((recordType == '' || recordType == this._NODE_TYPES.INDICATOR_SOURCE) && cube && paCubes.get(cube)) {
			sysReportSource = new GlideRecord(this._TABLES.SYS_REPORT_SOURCE);
			reportSource = paCubes.getValue(this._NODE_TYPES.REPORT_SOURCE);
			record = {
				id: cube,
				name: paCubes.getDisplayValue('name'),
				type: this._NODE_TYPES.INDICATOR_SOURCE,
				uuid: gs.generateGUID(),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.INDICATOR_SOURCE, paCubes),
				facts_table: paCubes.getValue('facts_table'),
			};
			sourceTable = this._getTableDisplayName(paCubes.getValue('facts_table'));
			childrenNodes = [{
				id: paCubes.getValue('facts_table'),
				name: sourceTable.name,
				sourceTableType: sourceTable.type,
				type: this._NODE_TYPES.SOURCE_TABLE,
				isLeafNode: true,
				uuid: gs.generateGUID(),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, paCubes.getValue('facts_table')),
			}];
			if (recordType == '' && reportSource && sysReportSource.get(reportSource)) {
				sourceTable = this._getTableDisplayName(sysReportSource.getValue('table'));
				childrenNodes.push({
					id: reportSource,
					name: sysReportSource.getDisplayValue('name'),
					type: this._NODE_TYPES.REPORT_SOURCE,
					uuid: gs.generateGUID(),
					_children: [{
						id: sysReportSource.getValue('table'),
						name: sourceTable.name,
						sourceTableType: sourceTable.type,
						type: this._NODE_TYPES.SOURCE_TABLE,
						uuid: gs.generateGUID(),
						isLeafNode: true,
						tooltip: sysReportSource.getValue('table'),
					}],
				});
			}
			record[childrenLabel] = childrenNodes;
			children = [record];
		}
		return children;
	},
	_getIndicatorScript: function (script, isChildren) {
		var children = [];
		var sourceTable;
		var record;
		var paScripts = new GlideRecord(this._TABLES.PA_SCRIPTS);
		var childrenName = isChildren ? 'children' : '_children';
		if (script && paScripts.get(script)) {
			sourceTable = this._getTableDisplayName(paScripts.getDisplayValue('table'));
			record = {
				id: script,
				name: paScripts.getDisplayValue('name'),
				type: this._NODE_TYPES.SCRIPT,
				uuid: gs.generateGUID(),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SCRIPT, paScripts),
			};
			record[childrenName] = [{
				id: paScripts.getDisplayValue('table'),
				name: sourceTable.name,
				sourceTableType: sourceTable.type,
				type: this._NODE_TYPES.SOURCE_TABLE,
				isLeafNode: true,
				uuid: gs.generateGUID(),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, paScripts.getDisplayValue('table')),
			}];
			children.push(record);
		}
		return children;
	},
	_getIndicatorJobs: function (indicator, recordType) {
		var children = [];
		var sysAuto;
		var paJobsIndicator;
		if (recordType == '' || recordType == this._NODE_TYPES.INDICATOR_JOBS) {
			sysAuto = new GlideRecord(this._TABLES.SYSAUTO);
			paJobsIndicator = sysAuto.addJoinQuery('pa_job_indicators', 'sys_id', 'job');
			paJobsIndicator.addCondition(this._NODE_TYPES.INDICATOR, indicator);
			sysAuto.query();
			while (sysAuto.next()) {
				var recordScope = sysAuto.getValue('sys_scope');
				isInCurrentScope = (recordScope == this._CURRENT_SCOPE);
				children.push({
					id: sysAuto.getValue('sys_id'),
					name: sysAuto.getDisplayValue('name'),
					type: this._NODE_TYPES.INDICATOR_JOBS,
					isActive: sysAuto.getValue('active') == '1',
					uuid: gs.generateGUID(),
					isInCurrentScope: isInCurrentScope,
					isLeafNode: true,
					tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.INDICATOR_JOBS, sysAuto),
				});
			}

		}
		return children;
	},
	_getIndicatorDetails: function (paIndicator, indicator, recordType, isCallFromIndicator) {
		var subChildren = [];
		var childrenLabel = isCallFromIndicator ? 'children' : '_children';
		var type = paIndicator.getValue('type');
		var record = {
			id: paIndicator.getValue('sys_id'),
			name: paIndicator.getDisplayValue('name'),
			type: this._NODE_TYPES.INDICATOR,
			indicatorType: type,
			data_source: paIndicator.getValue('data_source'),
			tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.INDICATOR, paIndicator),
			uuid: gs.generateGUID(),
		};
		var children = [record];
		var formula;
		var indicatorList;
		var i;
		subChildren = subChildren.concat(this._getIndicatorSourceDetails(paIndicator, recordType))
		.concat(this._getIndicatorScript(paIndicator.getValue(this._NODE_TYPES.SCRIPT)))
		.concat(this._getIndicatorJobs(indicator, recordType))
		.concat(this._getBreakdownFromIndicatorBrM2M(indicator, recordType));
		if (Number(type) === 2) {
			formula = paIndicator.getValue('formula') || '';
			indicatorList = this._evaluateFormulaAndGetIndicators(formula);
			for (i = 0; indicatorList && i < indicatorList.length; i++)
				if (indicatorList[i] && paIndicator.get(indicatorList[i]))
					subChildren = subChildren.concat(this._getIndicatorDetails(paIndicator, indicatorList[i], recordType));
		}
		if (subChildren.length > 0)
			record[childrenLabel] = subChildren;
		else if (record && subChildren.length === 0)
			record.isLeafNode = true;
		return children;
	},
	_getBreakdownFromIndicatorBrM2M: function (indicator, recordType) {
		var children = [];
		var paBreakdowns;
		var paIndicatorBreakdown;
		var breakdown;
		var record;
		if (recordType == '' || recordType == this._NODE_TYPES.BREAKDOWN || recordType == this._NODE_TYPES.BREAKDOWN_SOURCE) {
			paBreakdowns = new GlideRecord(this._TABLES.PA_BREAKDOWNS);
			paIndicatorBreakdown = new GlideRecord(this._TABLES.PA_INDICATOR_BREAKDOWNS);
			paIndicatorBreakdown.addQuery(this._NODE_TYPES.INDICATOR, '=', indicator);
			paIndicatorBreakdown.query();
			while (paIndicatorBreakdown.next()) {
				breakdown = paIndicatorBreakdown.getValue(this._NODE_TYPES.BREAKDOWN);
				if (breakdown && paBreakdowns.get(breakdown))
					children = children.concat(this._getBreakDownDetails(paBreakdowns, breakdown, recordType));
			}
		}
		if (children.length === 0)
			return [];
		record = {
			id: '-1',
			name: this._CONSTANTS.L10.LINKED_BREAKDOWNS,
			type: this._NODE_TYPES.BREAKDOWN_LINKED,
			uuid: gs.generateGUID(),
			_children: children,
		};
		return [record];
	},
	_getIndicatorFromM2M: function (id, recordType, parent, indicatorListPrev, breakdownListPrev) {
		var children = [];
		var indicatorList = indicatorListPrev || {};
		var breakdownList = breakdownListPrev || {};
		var indicator;
		var subChildren;
		var indicatorFetched;
		var label;
		var paBreakdowns = new GlideRecord(this._TABLES.PA_BREAKDOWNS);
		var paIndicator = new GlideRecord(this._TABLES.PA_INDICATORS);
		var widgetIndicator = new GlideAggregate(this._TABLES.PA_WIDGET_INDICATORS);
		widgetIndicator.addQuery(this._NODE_TYPES.WIDGET, id);
		if (parent)
			widgetIndicator.addQuery(this._NODE_TYPES.WIDGET_INDICATOR, parent);
		else
			widgetIndicator.addNullQuery(this._NODE_TYPES.WIDGET_INDICATOR);
		widgetIndicator.query();
		while (widgetIndicator.next()) {
			indicator = widgetIndicator.indicator;
			subChildren = [];
			if (indicator && !indicatorList[indicator] && paIndicator.get(indicator)) {
				indicatorFetched = this._getIndicatorDetails(paIndicator, indicator, recordType);
				subChildren = subChildren.concat(indicatorFetched);
				indicatorList[indicator] = indicatorFetched[0];
			} else if (indicatorList[indicator]) {
				indicatorList[indicator].uuid = gs.generateGUID();
				subChildren.push(JSON.parse(JSON.stringify(indicatorList[indicator])));
			}
			subChildren = this._setChildrenForBDandBDSource(recordType, widgetIndicator, breakdownList, paBreakdowns, subChildren);
			if (!parent)
				subChildren = this._setLinkedIndicator(id, recordType, widgetIndicator, indicatorList, breakdownList, subChildren);
			label = widgetIndicator.getValue('label');
			if (label)
				label = label + ' | ' + widgetIndicator.getDisplayValue(this._NODE_TYPES.INDICATOR);
			else
				label = widgetIndicator.getDisplayValue(this._NODE_TYPES.INDICATOR);
			children.push({
				id: widgetIndicator.getValue('sys_id'),
				name: label,
				type: this._NODE_TYPES.WIDGET_INDICATOR,
				uuid: gs.generateGUID(),
				isLeafNode: !subChildren.length,
				_children: subChildren,
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.WIDGET_INDICATOR, widgetIndicator),
			});
		}
		return children;
	},
	_getIndicatorsFromTag: function (paTag, tag, recordType) {
		var children = [];
		var paIndicator;
		var indicator;
		var paM2MIndicator = new GlideRecord(this._TABLES.PA_M2M_INDICATOR_TAGS);
		paM2MIndicator.addQuery('tag', '=', tag);
		paM2MIndicator.query();
		paIndicator = new GlideRecord(this._TABLES.PA_INDICATORS);
		while (paM2MIndicator.next()) {
			indicator = paM2MIndicator.getValue(this._NODE_TYPES.INDICATOR);
			if (indicator && paIndicator.get(indicator))
				children = children.concat(this._getIndicatorDetails(paIndicator, indicator, recordType));
		}
		return children;
	},
	_getGuidedSetUpPercentCompleted: function () {
		var percentCompleted = 0;
		var gr = new GlideRecordSecure(this._TABLES.GSW_STATUS_OF_CONTENT);
		gr.query('content', '8de556090b0212001e684ac3b6673ae7');
		gr.query();
		if (gr.next())
			percentCompleted = gr.getValue('progress');

		return Math.floor(percentCompleted);
	},
	_getInactiveContentPackCount: function () {
		var inactiveCount = 0;
		var gr = new GlideAggregate(this._TABLES.V_PLUGIN);
		gr.addEncodedQuery(this._CONSTANTS.INACTIVE_CONTENT_PACK_QUERY);
		gr.addAggregate('COUNT');
		gr.query();
		if (gr.next())
			inactiveCount = gr.getAggregate('COUNT');
		return inactiveCount;
	},
	_getDashboardGroupsCount: function () {
		var dashboardGroupsCount = 0;
		var gr = new GlideAggregate(this._TABLES.PA_DASHBOARDS_GROUP);
		gr.addAggregate('COUNT');
		gr.query();
		if (gr.next())
			dashboardGroupsCount = gr.getAggregate('COUNT');
		return dashboardGroupsCount;
	},
	_getDashboardsCount: function () {
		var dashboardsCount = 0;
		var gr = new GlideAggregate(this._TABLES.PA_DASHBOARDS);
		gr.addAggregate('COUNT');
		gr.query();
		if (gr.next())
			dashboardsCount = gr.getAggregate('COUNT');
		return dashboardsCount;
	},
	_getDiagnosticErrors: function () {
		var errorsCount = 0;
		var gr = new GlideAggregate(this._TABLES.PA_DIAGNOSTIC_RESULT);
		gr.addEncodedQuery('pa_diagnostic.severity=error');
		gr.addAggregate('COUNT');
		gr.query();
		if (gr.next()) {
			errorsCount = gr.getAggregate('COUNT');
		}
		return {
			count: errorsCount,
		};
	},
	_getFailedJobsCount: function () {
		var errors = 0;
		var ids = [];
		var log;
		var url = this._CONSTANTS.FAILED_JOB_COUNT_URL;
		var job = new GlideRecord(this._TABLES.SYSAUTO_PA);
		job.addEncodedQuery('run_type!=once^run_type!=on_demand^active=true');
		job.query();
		// for all non on demand jobs get the most recent job log
		while (job.next()) {
			log = new GlideRecord(this._TABLES.PA_JOB_LOGS);
			log.orderByDesc('completed');
			log.setLimit(1);
			log.addQuery('state', '!=', 'collecting');
			log.addQuery('job', job.getUniqueValue());
			log.query();
			if (log.next() && log.getValue('state') == 'collected_error') {
				errors++;
				ids.push(log.getValue('job'));
			}
		}
		if (ids.length > 0)
			url = '/sysauto_pa_list.do?sysparm_query=sys_idIN' + ids.join('%2C');
		return {
			count: errors,
			url: url,
		};
	},
	_handlePerformanceAnalytics: function (recordType, id, children) {
		var paIndicator;
		var paTag;
		var paBreakdowns;
		var indicator;
		var breakdown;
		var breakdown2;
		var tag;
		var widgetIndicator;
		var paWidgets;
		var pivotBreakdown;
		var breakdownList;
		paWidgets = new GlideRecord(this._TABLES.PA_WIDGETS);
		if ((recordType == '' || recordType !== this._NODE_TYPES.REPORT || recordType !== this._NODE_TYPES.INTERACTIVE_FILTER) && paWidgets.get(id)) {
			paIndicator = new GlideRecord(this._TABLES.PA_INDICATORS);
			paTag = new GlideRecord(this._TABLES.PA_TAGS);
			paBreakdowns = new GlideRecord(this._TABLES.PA_BREAKDOWNS);
			indicator = paWidgets.getValue(this._NODE_TYPES.INDICATOR);
			breakdown = paWidgets.getValue(this._NODE_TYPES.BREAKDOWN);
			breakdown2 = paWidgets.getValue('breakdown_level2');
			tag = paWidgets.getValue('tag');
			widgetIndicator = new GlideRecord(this._TABLES.PA_M2M_WIDGET_INDICATORS);
			if (indicator && paIndicator.get(indicator))
				children = children.concat(this._getIndicatorDetails(paIndicator, indicator, recordType));
			if (tag && paTag.get(tag))
				children = children.concat(this._getIndicatorsFromTag(paTag, tag, recordType));
			children = children.concat(this._getIndicatorFromM2M(id, recordType));
			if (recordType == '' || recordType == this._NODE_TYPES.BREAKDOWN || recordType == this._NODE_TYPES.BREAKDOWN_SOURCE) {
				breakdownList = [];
				if (breakdown2 && paBreakdowns.get(breakdown2))
					breakdownList = breakdownList.concat(this._getBreakDownDetails(paBreakdowns, breakdown2, recordType));
				if (breakdown && paBreakdowns.get(breakdown))
					breakdownList = breakdownList.concat(this._getBreakDownDetails(paBreakdowns, breakdown, recordType));
				if (breakdownList.length)
					children = children.concat(breakdownList);
				/* for breakdown widget of visualization type pivot scorecard fetch indicators and breakdown*/
				if (paWidgets.getValue('visualization') == 'pivot_scorecard') {
					widgetIndicator.addQuery(this._NODE_TYPES.WIDGET, '=', paWidgets.getValue('sys_id'));
					widgetIndicator.query();
					while (widgetIndicator.next()) {
						indicator = widgetIndicator.getValue(this._NODE_TYPES.INDICATOR);
						if (indicator && paIndicator.get(indicator))
							children = children.concat(this._getIndicatorDetails(paIndicator, indicator, recordType));
					}
					pivotBreakdown = paWidgets.getValue('pivot_breakdown');
					if (pivotBreakdown && paBreakdowns.get(pivotBreakdown))
						children = children.concat(this._getBreakDownDetails(paBreakdowns, pivotBreakdown, recordType));
				}
			}
		}
		return children;
	},
	_setLinkedIndicator: function (id, recordType, widgetIndicator, indicatorList, breakdownList, subChildren) {
		var suportingIndicator = this._getIndicatorFromM2M(id, recordType, widgetIndicator.getValue('sys_id'), indicatorList, breakdownList);
		if (suportingIndicator.length > 0)
			subChildren.push({
				id: '-1',
				name: this._CONSTANTS.L10.SUPPORTING_INDICATORS,
				type: this._NODE_TYPES.INDICATOR_LINKED,
				uuid: gs.generateGUID(),
				isLeafNode: !suportingIndicator.length,
				_children: suportingIndicator,
			});
		return subChildren;
	},
	_setChildrenForBDandBDSource: function (recordType, widgetIndicator, breakdownList, paBreakdowns, subChildren) {
		var breakdown;
		var breakdown2;
		var breakdownFetched;
		var followedBreakdown;
		if (recordType == '' || recordType == this._NODE_TYPES.BREAKDOWN || recordType == this._NODE_TYPES.BREAKDOWN_SOURCE) {
			breakdown = widgetIndicator.breakdown;
			if (breakdown && !breakdownList[breakdown] && paBreakdowns.get(breakdown)) {
				breakdownFetched = this._getBreakDownDetails(paBreakdowns, breakdown, recordType);
				subChildren = subChildren.concat(breakdownFetched);
				breakdownList[breakdown] = breakdownFetched[0];
			} else if (breakdownList[breakdown]) {
				breakdownList[breakdown].uuid = gs.generateGUID();
				subChildren.push(JSON.parse(JSON.stringify(breakdownList[breakdown])));
			}
			breakdown2 = widgetIndicator.breakdown_level2;
			if (breakdown2 && !breakdownList[breakdown2] && paBreakdowns.get(breakdown2)) {
				breakdownFetched = this._getBreakDownDetails(paBreakdowns, breakdown2, recordType);
				subChildren = subChildren.concat(breakdownFetched);
				breakdownList[breakdown2] = breakdownFetched[0];
			} else if (breakdownList[breakdown2]) {
				breakdownList[breakdown2].uuid = gs.generateGUID();
				subChildren.push(JSON.parse(JSON.stringify(breakdownList[breakdown2])));
			}
			followedBreakdown = widgetIndicator.followed_breakdown;
			if (followedBreakdown && !breakdownList[followedBreakdown] && paBreakdowns.get(followedBreakdown)) {
				breakdownFetched = this._getBreakDownDetails(paBreakdowns, followedBreakdown, recordType);
				subChildren = subChildren.concat(breakdownFetched);
				breakdownList[followedBreakdown] = breakdownFetched[0];
			} else if (breakdownList[followedBreakdown]) {
				breakdownList[followedBreakdown].uuid = gs.generateGUID();
				subChildren.push(JSON.parse(JSON.stringify(breakdownList[followedBreakdown])));
			}
		}
		return subChildren;
	},
	setXMLResult: function(type, response) {
		var result = this.newItem('result');
		result.setAttribute(type, JSON.stringify(response));
	},
	_getSourceTable: function(tableName) {
		var sourceTable = this._getTableDisplayName(tableName);
		var response = {
			id: tableName,
			name: sourceTable.name,
			sourceTableType: sourceTable.type,
			type: this._NODE_TYPES.SOURCE_TABLE,
			isLeafNode: true,
			uuid: gs.generateGUID(),
			tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, tableName),
		};
		return response;
	},
	_getReportsOfReportSource: function(sysID) {
		var resp = [];
		var grReport = new GlideRecord(this._TABLES.SYS_REPORT);
		grReport.addQuery('report_source',sysID);
		grReport.query();
		while(grReport.next()) {
			var obj = {};
			obj.type = this._NODE_TYPES.REPORT;
			obj.name = gs.getMessage(grReport.getDisplayValue('title') || '');
			obj.id = grReport.getUniqueValue();
			obj.uuid = gs.generateGUID();
			obj.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.REPORT, grReport);
			resp.push(obj);
		}
		return resp;
	},
	_isTabLeafNode: function (tabSysId) {
		var widgets = [];
		var tab = null;
		var tabId = null;
		var sysGridCanvasId = null;
		var canvasPane = null;
		var portal = null;
		var response = null;
		var dashboard = new GlideRecord(this._TABLES.PA_M2M_DASHBOARD_TABS);
		var isLeafNode = true;

		if (dashboard.get('tab', tabSysId)) {
			tabId = dashboard.getValue('tab');
			tab = new GlideRecord(this._TABLES.PA_TABS);
			if (tab.get(tabId)) {
				sysGridCanvasId = this._getGridCanvasId(tab, tabId);
				canvasPane = new GlideRecord(this._TABLES.SYS_GRID_CANVAS_PANE);
				canvasPane.addQuery('grid_canvas', sysGridCanvasId);
				canvasPane.query();
				while (canvasPane.next()) {
					portal = new GlideRecord(this._TABLES.SYS_PORTAL);
					portal.addQuery('sys_id', canvasPane.getValue('portal_widget'));
					portal.query();
					if (portal.next()) {
						response = this._getOnlyWidgetsFromPortalPref(portal);
						// when we add an empty placeholder then id is negative [-1,-2] for different domain we will not get record
						if ((response.id < 0 && this._isRendererSupported(response.renderer))
							|| !this._isValidForDisplay(response))
							isLeafNode = true;
						else {
							isLeafNode = false;
							break;
						}
					}
				}
			}
		}
		return isLeafNode;
	},
	_getOnlyWidgetsFromPortalPref : function(portal) {
		var widget = {};
		var portalPreferenceName = null;
		var portalPreference = new GlideRecord(this._TABLES.SYS_PORTAL_PREFERENCES);
		portalPreference.addQuery('portal_section', portal.getValue('sys_id'));
		portalPreference.query();
		while (portalPreference.next()) {
			portalPreferenceName = portalPreference.getDisplayValue('name');
			if (portalPreferenceName == 'sys_id')
				widget.id = portalPreference.getValue('value');
			if (portalPreferenceName == 'renderer')
				widget.renderer = portalPreference.getValue('value');
			if (portalPreferenceName == 'title')
				widget.name = portalPreference.getDisplayValue('value');
		}
		if (widget.id < 0)
			return widget;
		widget.type = this._NODE_TYPES.WIDGET;
		widget.uuid = gs.generateGUID();
		widget.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfoForWidget(widget.id, widget.renderer, widget);
		return widget;	
	},
	_isValidForDisplay: function(widgetInfo) {
		if (widgetInfo && widgetInfo.id < 0)
			return false;
		var SUPPORTED_RENDERERS = this._CONSTANTS.SUPPORTED_RENDERERS;
		if(!widgetInfo.renderer)
			return false;
		var renderer = JSON.parse(JSON.stringify(widgetInfo.renderer));
		var isValidForDisplay = false;
		switch (renderer) {
		case SUPPORTED_RENDERERS.PERFORMANCE_ANALYTICS:
			 isValidForDisplay  = new GlideRecordSecure(this._TABLES.PA_WIDGETS).get(widgetInfo.id);
			break;
		case SUPPORTED_RENDERERS.DASHBOARD:
			isValidForDisplay = new GlideRecordSecure(this._TABLES.SYS_GAUGE).get(widgetInfo.id);
			break;
		case SUPPORTED_RENDERERS.REPORT:
			isValidForDisplay = new GlideRecordSecure(this._TABLES.SYS_REPORT).get(widgetInfo.id);
			break;
		case SUPPORTED_RENDERERS.HOMEPAGE_PUBLISHERS:
			isValidForDisplay = new GlideRecordSecure(this._TABLES.SYS_UI_HP_PUBLISHER).get(widgetInfo.id);
			break;
		default:
			isValidForDisplay = true;
			break;
		}
		return isValidForDisplay;
	},
	_evaluateFormulaAndGetIndicators: function(formulaStr) {
		var indicators = "";
		var parsedFormula = new SNC.PAFormula(formulaStr);
		if (parsedFormula.isValid())
			indicators = SNC.PAFormula.getIndicators(parsedFormula.getFormula());

	return (indicators) ? indicators.split(",") : [];	
	},
	type: 'PAAdminConsoleHelper',
});
```