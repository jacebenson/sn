---
title: "PAImpactAnalysisUtil"
id: "paimpactanalysisutil"
---

API Name: global.PAImpactAnalysisUtil

```js
var PAImpactAnalysisUtil = Class.create();
PAImpactAnalysisUtil.prototype = Object.extendsObject(PAAdminConsoleHelper, {
	//job>in>
	getJobDataForBottomUp: function () {
		var sysId = this.getParameter('sysparm_sys_id');
		var children = [];
		var indicatorRec = null;
		var jobIndicators = new GlideRecordSecure(this._TABLES.PA_JOB_INDICATORS);
		var sysauto = new GlideRecord(this._TABLES.SYSAUTO);
		if (sysauto.get(sysId)) {
			jobIndicators.addQuery('job', '=', sysId);
			jobIndicators.query();

			indicatorRec = new GlideRecordSecure(this._TABLES.PA_INDICATORS);
			while (jobIndicators.next())
				if (indicatorRec.get(jobIndicators.getValue('indicator')))
					children = children.concat(this._getIndicatorDetailsForBottomUp(indicatorRec, true));
		}

		this.setXMLResult('indicator_jobs', children);
	},
	// in>wid>
	getIndicatorForBottomUp: function () {
		var self = this;
		var sysId = self.getParameter('sysparm_sys_id');
		var response = [];
		var formulaIndicator = [];
		var paIndicator = new GlideRecord(this._TABLES.PA_INDICATORS);
		if (sysId && paIndicator.get(sysId)) {
			response = self._getWidgetsFromIndicator(sysId);
			if (paIndicator.getValue('type') !== 2) {
				formulaIndicator = self._getReferencedFormulaIndicator(paIndicator);
				if (formulaIndicator && formulaIndicator.length > 0)
					response = response.concat(formulaIndicator);
			}
			response = response.concat(self._getWorkBenchWidgets(paIndicator), self._getWidgetForPivotScoreCard(paIndicator));
		}
		this.setXMLResult('indicator', response);
	},
	// bre->in
	getBreakdownForBottomUp: function () {
		var self = this;
		var sysId = self.getParameter('sysparm_sys_id');
		var paBreakDown = new GlideRecord(this._TABLES.PA_BREAKDOWNS);
		var children = [];
		if (sysId && paBreakDown.get(sysId))
			children = self._getIndicatorsFromBreakDown(paBreakDown);

		this.setXMLResult('breakdown', children);
	},
	// wid>tab>
	getWidgetForBottomUp: function () {
		// get tabs
		var sysId = this.getParameter('sysparm_sys_id');
		var tabs = this._getTabsFromWidget(sysId) || [];
		this.setXMLResult('widget', tabs);
	},
	// bdSrc > breakdown+dashboard >
	getBreakdownSourceForBottomUp: function () {
		var self = this;
		var sysId = self.getParameter('sysparm_sys_id');
		var paDimensions = new GlideRecord(this._TABLES.PA_DIMENSIONS);
		var children = [];
		if (sysId && paDimensions.get(sysId))
			children = self._getNodesForBreakdownSource(paDimensions);

		this.setXMLResult('breakdown_source', children);
	},
	// indSrc > ind
	getIndicatorSourceForBottomUp: function () {
		var self = this;
		var sysId = self.getParameter('sysparm_sys_id');
		var paCubes = new GlideRecord(this._TABLES.PA_INDICATOR_SOURCE); // pa_cubes
		var children = [];
		if (sysId && paCubes.get(sysId))
			children = this._getNodesForIndicatorSource(paCubes);
		this.setXMLResult('indicator_source', children);
	},
	// report > tab
	getReportsForBottomUp: function () {
		var self = this;
		var sysId = self.getParameter('sysparm_sys_id');
		var paSysReport = new GlideRecordSecure(this._TABLES.SYS_REPORT);
		var paGaugeReport = new GlideRecordSecure(this._TABLES.SYS_GAUGE);
		var children = [];

		// check the origin of the report first if gauge then get the corresponing report rec

		if (sysId && paSysReport.get(sysId))
			children = self._getTabsFromWidget(sysId);
		if (paGaugeReport.get('report', sysId))
			children = children.concat(self._getTabsFromWidget(paGaugeReport.getValue('sys_id')));

		children = children.filter(function (elem, index, me) { // remove any duplicates exists
			return index === me.indexOf(elem);
		});
		this.setXMLResult('report', children);
	},
	// IF > TAB + BREAK DOWN SOURCE
	getInteractiveFilterForBottomUp: function () {
		var self = this;
		var sysId = self.getParameter('sysparm_sys_id');
		var children = [];
		var grFilter = new GlideRecord(this._TABLES.SYS_UI_HP_PUBLISHER);
		if (grFilter.get(sysId))
			children = this._getNodesForInteractiveFilter(grFilter);

		this.setXMLResult('interactive_filter', children);
	},
	getTabForBottomUp: function () {
		var sysId = this.getParameter('sysparm_sys_id');
		var children = this._getDashboardFromTab(sysId);
		this.setXMLResult('tab', children);
	},
	getDashBoardForBottomUp: function () {
		var sysId = this.getParameter('sysparm_sys_id');
		var grDashboard = new GlideRecordSecure(this._TABLES.PA_DASHBOARDS);
		var children = [];

		if (grDashboard.get(sysId))
			children = this._getDashBoardGroupFromDashboard(grDashboard);

		this.setXMLResult('dashboard', children);
	},
	_getWidgetsFromIndicator: function (indicatorID) {
		var renderer = this._CONSTANTS.SUPPORTED_RENDERERS.PERFORMANCE_ANALYTICS;
		var children = [];
		var widget = {};
		var gr = new GlideRecordSecure(this._TABLES.PA_WIDGETS);
		gr.addQuery('indicator', '=', indicatorID);
		gr.query();
		while (gr.next()) {
			widget = {
				name: gr.getDisplayValue('name'),
				id: gr.getValue('sys_id'),
				uuid: gs.generateGUID(),
				type: 'widget',
				renderer: renderer,
				widgetType: gr.getValue('type'),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfoForWidget(gr.getValue('sys_id'), renderer, gr),
			};
			children.push(widget);
		}
		return children;
	},
	_getDashboardFromTab: function (tabID) {
		var dashboards = [];
		var dashBoardTab = new GlideRecordSecure(this._TABLES.PA_M2M_DASHBOARD_TABS);
		var padDashboard = new GlideRecordSecure(this._TABLES.PA_DASHBOARDS);
		var record = null;
		dashBoardTab.addQuery('tab', '=', tabID);
		dashBoardTab.query();
		while (dashBoardTab.next()) {
			record = {
				name: dashBoardTab.getDisplayValue('dashboard.name'),
				id: dashBoardTab.getDisplayValue('dashboard.sys_id'),
				uuid: gs.generateGUID(),
				type: 'dashboard',
				tooltip: (padDashboard.get(dashBoardTab.getDisplayValue('dashboard.sys_id'))) ? this.paAdminConsoleAdditionalInfo._getTooltipInfo('dashboard', padDashboard) : '',
			};
			dashboards.push(record);
		}
		return dashboards;
	},
	_getDashBoardGroupFromDashboard: function (paDashBoard) {
		var dGrp = new GlideRecord(this._TABLES.PA_DASHBOARDS_GROUP);
		var record = {};
		var dashboardGroup = [];
		if (dGrp.get(paDashBoard.getValue('group')))
			record = {
				name: dGrp.getDisplayValue('name'),
				id: dGrp.getValue('sys_id'),
				uuid: gs.generateGUID(),
				type: 'group',
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo('group', dGrp),
				isUsedForAvailable: true,
			};
		else
			record = {
				name: gs.getMessage('(Others)'),
				id: '-1',
				uuid: gs.generateGUID(),
				type: 'group',
				isUsedForAvailable: true,
			};

		dashboardGroup.push(record);
		return dashboardGroup;
	},
	_getIndicatorDetailsForBottomUp: function (paIndicator) {
		var subChildren = [];
		var formula = null;
		var indicatorList = null;
		var i = 0;
		var type = paIndicator.getValue('type');
		var record = {
			id: paIndicator.getValue('sys_id'),
			name: paIndicator.getDisplayValue('name'),
			type: 'indicator',
			indicatorType: type,
			tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo('indicator', paIndicator),
			uuid: gs.generateGUID(),
		};
		subChildren.push(record);
		if (Number(type) === 2) { // for formula indicator
			formula = paIndicator.getValue('formula') || '';
			indicatorList = this._evaluateFormulaAndGetIndicators(formula);
			for (i = 0; indicatorList && i < indicatorList.length; i++)
				if (indicatorList[i] && paIndicator.get(indicatorList[i]))
					subChildren = subChildren.concat(this._getIndicatorDetailsForBottomUp(paIndicator));
		}
		return subChildren;
	},
	_getBreakDownDetailsForBottomUp: function (paBreakdown, sysId) {
		var record = {
			id: paBreakdown.getValue('sys_id'),
			name: paBreakdown.getDisplayValue('name'),
			type: 'breakdown',
			uuid: gs.generateGUID(),
			tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo('breakdown', paBreakdown),
		};

		var children = [];
		var paIndicator = new GlideRecord(this._TABLES.PA_INDICATORS);
		var paIndicatorBreakdowns = new GlideRecord('pa_indicator_breakdowns');
		paIndicatorBreakdowns.addQuery('breakdown', sysId);
		paIndicatorBreakdowns.query();

		while (paIndicatorBreakdowns.next() && paIndicator.get(paIndicatorBreakdowns.getValue('indicator'))) {
			record = {
				id: paIndicator.getValue('sys_id'),
				name: paIndicator.getDisplayValue('name'),
				type: 'indicator',
				indicatorType: paIndicator.getValue('type'),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo('indicator', paIndicator),
				uuid: gs.generateGUID(),
			};
			children.push(record);
		}
	},
	_getNodesForBreakdownSource: function (paDimension) {
		var breakdownSourceId = paDimension.getValue('sys_id');
		// get all breakdowns
		var grBreakdown = new GlideRecordSecure(this._TABLES.PA_BREAKDOWNS);
		var breakdowns = [];
		var dashboards = [];
		var record = null;
		var paDashBoardSources = new GlideRecordSecure(this._TABLES.PA_BREAKDOWN_SOURCE);
		var dashboard = new GlideRecordSecure(this._TABLES.PA_DASHBOARDS);
		grBreakdown.addQuery('dimension', breakdownSourceId);
		grBreakdown.query();
		while (grBreakdown.next()) {
			record = {
				id: grBreakdown.getValue('sys_id'),
				name: grBreakdown.getDisplayValue('name'),
				type: 'breakdown',
				uuid: gs.generateGUID(),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo('breakdown', grBreakdown),
			};
			breakdowns.push(record);
		}

		// get all dashboard using this breakdown
		paDashBoardSources.addQuery('breakdown_source', breakdownSourceId);
		paDashBoardSources.query();

		while (paDashBoardSources.next() && dashboard.get(paDashBoardSources.getValue('dashboard'))) {
			record = {
				name: dashboard.getDisplayValue('sys_name'),
				id: dashboard.getDisplayValue('sys_id'),
				uuid: gs.generateGUID(),
				type: 'dashboard',
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo('dashboard', dashboard),
			};
			dashboards.push(record);
		}
		return [].concat(breakdowns, dashboards);
	},
	_getIndicatorsFromBreakDown: function (paBreakDown) {
		var grIndBreakdown = new GlideRecordSecure(this._TABLES.PA_INDICATOR_BREAKDOWNS);
		var paIndicator = new GlideRecordSecure(this._TABLES.PA_INDICATORS);
		var indicators = [];
		var record = null;
		grIndBreakdown.addQuery('breakdown', paBreakDown.getValue('sys_id'));
		grIndBreakdown.query();
		while (grIndBreakdown.next() && paIndicator.get(grIndBreakdown.getValue('indicator'))) {
			record = {
				id: paIndicator.getValue('sys_id'),
				name: paIndicator.getDisplayValue('name'),
				type: 'indicator',
				indicatorType: paIndicator.getValue('type'),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo('indicator', paIndicator),
				uuid: gs.generateGUID(),
				isUsedForAvailable: this._isIndicatorLeafNode(paIndicator),
			};
			indicators.push(record);
		}
		return indicators;
	},
	_isIndicatorLeafNode: function (paIndicator) {
		var isLeaf = true;
		var formula = null;
		var indicatorList = null;
		var type = paIndicator.getValue('type');
		var grIndicator = new GlideRecordSecure(this._TABLES.PA_INDICATORS);
		var i = 0;
		var indicatorID = null;
		var gr = null;
		if (Number(type) === 2) { // for formula indicator
			formula = paIndicator.getValue('formula') || '';
			indicatorList = this._evaluateFormulaAndGetIndicators(formula);
			for (i = 0; indicatorList && i < indicatorList.length; i++)
				if (indicatorList[i] && grIndicator.get(indicatorList[i])) {
					isLeaf = false;
					break;
				}
		} else {
			indicatorID = paIndicator.getValue('sys_id');
			gr = new GlideRecordSecure(this._TABLES.PA_WIDGETS);
			gr.addQuery('indicator', '=', indicatorID);
			gr.query();
			if (gr.getRowCount() > 0)
				isLeaf = false;
		}
		return isLeaf;
	},
	_getNodesForIndicatorSource: function (paCubes) {
		var indicators = [];
		var record = null;
		var paIndicator = new GlideRecordSecure(this._TABLES.PA_INDICATORS);
		paIndicator.addQuery('cube', paCubes.getValue('sys_id'));
		paIndicator.query();
		while (paIndicator.next()) {
			record = {
				id: paIndicator.getValue('sys_id'),
				name: paIndicator.getDisplayValue('name'),
				type: 'indicator',
				indicatorType: paIndicator.getValue('type'),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo('indicator', paIndicator),
				uuid: gs.generateGUID(),
			};
			indicators.push(record);
		}
		return indicators;
	},
	_getTabsFromWidget: function (sysId) {
		// fetch tabs
		var paTabs = null;
		var tabs = [];
		var gridCanvasPaneList = [];
		var record = null;
		var i = 0;
		var sysGridCanvasPane = null;

		var pref = new GlideRecord(this._TABLES.SYS_PORTAL_PREFERENCES);
		pref.addQuery('value', sysId);
		pref.query();
		var portalSections = [];
		while (pref.next())
			portalSections.push(pref.getValue("portal_section"));

		for (i = 0; i < portalSections.length; i++) {
			sysGridCanvasPane = new GlideRecord(this._TABLES.SYS_GRID_CANVAS_PANE);
			sysGridCanvasPane.addQuery('portal_widget', portalSections[i]);
			sysGridCanvasPane.query();
			while (sysGridCanvasPane.next())
				gridCanvasPaneList.push(sysGridCanvasPane.getValue('grid_canvas'));
		}
		for (i = 0; i < gridCanvasPaneList.length; i++) {
			paTabs = new GlideRecordSecure(this._TABLES.PA_TABS);
			paTabs.addQuery('canvas_page', gridCanvasPaneList[i]);
			paTabs.query();
			while (paTabs.next()) {
				record = {
					id: paTabs.getValue('sys_id'),
					tabUniqueId: paTabs.getValue('sys_id'),
					name: paTabs.getDisplayValue('name'),
					type: 'tab',
					tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo('tab', paTabs.getValue('sys_id')),
					uuid: gs.generateGUID(),
				};
				tabs.push(record);
			}
		}
		return tabs;
	},
	_getNodesForInteractiveFilter: function (grFilter) {
		// get tab records and breakdown sources
		var record = null;
		var filterSysId = grFilter.getValue('sys_id');
		var paDimensions = new GlideRecordSecure(this._TABLES.PA_DIMENSIONS);
		var tabs = [];
		var breakdownSources = [];
		var paDashBoardSources = new GlideRecordSecure(this._TABLES.PA_BREAKDOWN_SOURCE);
		paDashBoardSources.addQuery('publisher', filterSysId);
		paDashBoardSources.query();
		while (paDashBoardSources.next()) {
			if (paDimensions.get(paDashBoardSources.getValue('breakdown_source'))) {
				record = {
					name: paDimensions.getDisplayValue('name'),
					id: paDimensions.getDisplayValue('sys_id'),
					uuid: gs.generateGUID(),
					facts_table: paDimensions.getDisplayValue('facts_table'),
					type: this._NODE_TYPES.BREAKDOWN_SOURCE,
					tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.BREAKDOWN_SOURCE, paDimensions),
				};
				breakdownSources.push(record);
			}
		}
		tabs = this._getTabsFromWidget(filterSysId);
		return [].concat(breakdownSources, tabs);
	},
	_getReferencedFormulaIndicator: function(paIndicator) {
        var formula = null;
        var indicatorList = null;
        var record = null;
        var formulaIndicators = [];
        var uniqueIndicatorList = [];
        var sysID = paIndicator.getValue('sys_id');
        var formulaIndicator = new GlideRecordSecure(this._TABLES.PA_INDICATORS);
        formulaIndicator.addQuery('type', '2'); // get all formula indicators
        formulaIndicator.query();
        while (formulaIndicator.next()) {
            formula = formulaIndicator.getValue('formula') || '';
			indicatorList = this._evaluateFormulaAndGetIndicators(formula);
            if (formula && indicatorList) {
                uniqueIndicatorList = indicatorList.filter(function(elem, index, self) { // remove any duplicates exists
                    return index === self.indexOf(elem);
                });
                if (uniqueIndicatorList.indexOf(sysID) > -1) {
                    record = {
                        id: formulaIndicator.getValue('sys_id'),
                        name: formulaIndicator.getDisplayValue('name'),
                        type: 'indicator',
                        indicatorType: '2',
                        tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo('indicator', formulaIndicator),
                        uuid: gs.generateGUID(),
                    };
                    formulaIndicators.push(record);
                }
            }
        }
        return formulaIndicators;
    },

	// report_source to reports
	getReportSourceForBottomUp: function () {
		var self = this;
		var sysId = self.getParameter('sysparm_sys_id');
		var children = [];
		if (sysId)
			children = this._getReportsOfReportSource(sysId);
		this.setXMLResult('report_source', children);
	},
	// To sort based on order and get first N node
	_getLimitNodes: function (nodes) {
		var order = {
			indicator_source: 0,
			breakdown_source: 1,
			report: 2,
			report_source: 3,
			interactive_filter: 4,
			cascading_filter: 5,
		};
		function sort(a, b) {
			var type1 = a.type;
			var type2 = b.type;
			var result = (order[type1] - order[type2]) || null;
			if (result)
				return result;
			return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
		}
		nodes.sort(sort);
	},
	_getTooltipForFirstSetOfNodes: function (nodes) {
		for (var i = 0; i < nodes.length; i++) {
			var tableName = nodes[i].table;
			if (!tableName)
				continue;
			var gr = new GlideRecord(tableName);
			gr.addQuery('sys_id', nodes[i].id);
			gr.query();
			if (gr.next())
				nodes[i].tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo(nodes[i].type, gr);
		}
	},
	// table to all parent
	getTableForBottomUp: function () {
		var self = this;
		var tableName = self.getParameter('sysparm_table_name');
		var response = [];
		if (tableName) {
			for (var i = 0; i < this._TABLE_API.TABLES.length; i++) {
				var currentTable = this._TABLE_API.TABLES[i];
				var tableField = this._TABLE_API.DATA_MAPPING[currentTable].tableField;
				var nameField = this._TABLE_API.DATA_MAPPING[currentTable].nameField;
				var type = this._TABLE_API.DATA_MAPPING[currentTable].type;
				var gRecord = new GlideRecord(currentTable);
				gRecord.addQuery(tableField, tableName);
				gRecord.query();
				while (gRecord.next()) {
					var obj = {};
					obj.id = gRecord.getUniqueValue();
					obj.type = type;
					obj.name = gRecord.getDisplayValue(nameField);
					obj.uuid = gs.generateGUID();
					obj.table = currentTable;
					if (obj.id)
						response.push(obj);
				}
			}
			// Get all relevant interactive filters
			var records = new SNC.InteractiveFilterUtils().getRelevantFiltersOfTable(tableName) || '[]';
			records = JSON.parse(records);
			var selectedFields = records.map(function (e) {
				return {
					id: e.sys_id,
					name: e.name,
					table: self._TABLES.SYS_UI_HP_PUBLISHER,
					type: self._NODE_TYPES.INTERACTIVE_FILTER,
					uuid: gs.generateGUID(),
				};
			});
			response = selectedFields.concat(response);
		}
		// TODO: Use limit nodes to fetch tooltip for only first N nodes.
		// this._getLimitNodes(response);
		// var limitNodes = response.splice(0,6);
		this._getTooltipForFirstSetOfNodes(response);
		// var finalResponse = limitNodes.concat(response);
		this.setXMLResult('source_tables', response);
		return response;
	},
	_getWorkBenchWidgets: function (paIndicator) {
		var paWidgetRenderer = this._CONSTANTS.SUPPORTED_RENDERERS.PERFORMANCE_ANALYTICS;
		var widgets = [];
		var allWidgetsKey = {}; // using this to remove duplicate
		var grPaWidget = new GlideRecordSecure(this._TABLES.PA_WIDGETS);
		var grPaWidgetIndicator = new GlideRecordSecure(this._TABLES.PA_WIDGET_INDICATORS);
		grPaWidgetIndicator.addQuery('indicator', paIndicator.getUniqueValue());
		grPaWidgetIndicator.query();
		while (grPaWidgetIndicator.next() && grPaWidget.get(grPaWidgetIndicator.getValue("widget"))) {
			if (allWidgetsKey[grPaWidget.getValue('sys_id')] != grPaWidget.getValue('sys_id')) {
			widgets.push({
				id: grPaWidget.getValue('sys_id'),
				renderer: paWidgetRenderer,
				widgetType: grPaWidget.getValue('type'),
				name: grPaWidget.getDisplayValue('name'),
				type: this._NODE_TYPES.WIDGET,
				uuid: gs.generateGUID(),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfoForWidget(grPaWidget.getValue('sys_id'), paWidgetRenderer, grPaWidget),
			});
				allWidgetsKey[grPaWidget.getValue('sys_id')] = grPaWidget.getValue('sys_id');
			}
		}
		return widgets;
	},
	/* When we create an widget of type breakdown and visualization = 'pivot scoreacrd' and link it to an indicator we have to fetch that record also*/
	_getWidgetForPivotScoreCard: function (paIndicator) {
		var paWidgetRenderer = this._CONSTANTS.SUPPORTED_RENDERERS.PERFORMANCE_ANALYTICS;
		var widgets = [];
		var grPaWidget = new GlideRecordSecure(this._TABLES.PA_WIDGETS);
		var grPaM2mWidgetIndicator = new GlideRecordSecure(this._TABLES.PA_M2M_WIDGET_INDICATORS);
		grPaM2mWidgetIndicator.addQuery('indicator', paIndicator.getUniqueValue());
		grPaM2mWidgetIndicator.query();
		while (grPaM2mWidgetIndicator.next() && grPaWidget.get(grPaM2mWidgetIndicator.getValue("widget"))) {
			widgets.push({
				id: grPaWidget.getValue('sys_id'),
				renderer: paWidgetRenderer,
				widgetType: grPaWidget.getValue('type'),
				name: grPaWidget.getDisplayValue('name'),
				type: this._NODE_TYPES.WIDGET,
				uuid: gs.generateGUID(),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfoForWidget(grPaWidget.getValue('sys_id'), paWidgetRenderer, grPaWidget),
			});
		}
		return widgets;
	},
	type: 'PAImpactAnalysisUtil',
});
```