---
title: "PAAdminConsoleUtil"
id: "paadminconsoleutil"
---

API Name: global.PAAdminConsoleUtil

```js
var PAAdminConsoleUtil = Class.create();
PAAdminConsoleUtil.prototype = Object.extendsObject(PAAdminConsoleHelper, {
	getDashboardSolutionHierarchy: function () {
		var encodedQuery = this.getParameter('sysparm_encoded_query');
		return this.getSolution(encodedQuery);
	},
	/**
	 * This is for getSolutions data
	 * @param: encodedQuery
	 */
	getSolution: function (encodedQuery) {
		var parsedEncodedQuery = JSON.parse(encodedQuery);
		var root = {};
		var response = {};
		if (!parsedEncodedQuery.pa_dashboards_group) {
			root = {
				name: this._CONSTANTS.L10.SOLUTION,
				id: '-1',
				type: this._NODE_TYPES.ROOT,
			};
			root.children = this.getDashboardGroups(encodedQuery);
		} else {
			response = this.getDashboardGroups(encodedQuery);
			if (response && response.length)
				root = response[0];
		}
		this.setXMLResult('solutions', root);
		return JSON.stringify(root);
	},
	getDashboardGroups: function (encodedQuery) {
		var groups = {};
		var allGroups = [];
		var groupIdsList = [];
		var parsedEQuery = JSON.parse(encodedQuery) || {};
		var dGrp = null;
		var isFromSolution = true;
		var childrenLabel = 'children';
		var dashboard = null;
		var groupId = null;
		var groupName = null;
		var currentGroup = null;
		var group = null;
		var grp = null;
		var query = null;
		var grHierarchy = new GlideRecordSecure(this._TABLES.PA_DASHBOARDS);

		if (parsedEQuery.pa_dashboards_group) {
            if (parsedEQuery.pa_dashboards_group.indexOf("-1") > -1)
                grHierarchy.addEncodedQuery('groupISEMPTY'); // for others
            else
			    grHierarchy.addEncodedQuery(parsedEQuery.pa_dashboards_group);
			isFromSolution = false;
        } 
		if (parsedEQuery.pa_dashboards)
			grHierarchy.addEncodedQuery(parsedEQuery.pa_dashboards);
		childrenLabel = isFromSolution ? '_children' : 'children';
		grHierarchy.query();
		while (grHierarchy.next()) {
			dashboard = {
				name: grHierarchy.getDisplayValue('name'),
				id: grHierarchy.getDisplayValue('sys_id'),
				uuid: gs.generateGUID(),
				type: this._NODE_TYPES.DASHBOARD,
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo('dashboard', grHierarchy),
			};
			groupId = (typeof grHierarchy.getValue('group') === 'string') ? grHierarchy.getDisplayValue('group.sys_id') : -1;
			groupName = groupId === -1 ? '(' + this._CONSTANTS.L10.OTHERS + ')' : grHierarchy.getDisplayValue('group');
			dGrp = new GlideRecord(this._TABLES.PA_DASHBOARDS_GROUP);

			if (groups[groupId]) {
				currentGroup = groups[groupId];
				currentGroup[childrenLabel] = currentGroup[childrenLabel] || [];
				currentGroup[childrenLabel].push(dashboard);
			} else {
				group = {
					id: groupId,
					name: groupName,
					uuid: gs.generateGUID(),
					type: this._NODE_TYPES.GROUP,
				};
				if (groupId !== -1)
					groupIdsList.push(groupId);
				if (dGrp.get(groupId))
					group.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.GROUP, dGrp);
				group[childrenLabel] = [];
				group[childrenLabel].push(dashboard);
				groups[groupId] = group;
			}
		}

		for (grp in groups)
			if (groups.hasOwnProperty(grp))
				allGroups.push(groups[grp]);

		allGroups = this._setAllGroups(allGroups, parsedEQuery, dGrp, query, groupIdsList);
		return allGroups;
	},
	getDashboardTabsAndBreakdown: function () {
		var dashboardId = this.getParameter('sysparm_dashboard_id');
		var response = {};
		var tabs = this.getDashboardTabs(dashboardId);
		var breakdownSources = this.getDashboardBreakdownSource(dashboardId);
		var children = tabs.concat(breakdownSources);
		response = this._getDashboardInfo(dashboardId) || {};
		response.children = children;
		this.setXMLResult('dashboard', response);
		return JSON.stringify(response);
	},
	getDashboardTabs: function (dashboardId) {
		var isDashboardIdPassed = false;
		var tabs = [];
		var response = {};
		var grTabs = new GlideRecordSecure(this._TABLES.PA_M2M_DASHBOARD_TABS);
		var tab = null;
		var tabId = null;

		if (dashboardId)
			isDashboardIdPassed = true;
		dashboardId = dashboardId || this.getParameter('sysparm_dashboard_id');
		grTabs.addActiveQuery();
		grTabs.addQuery('dashboard', '=', dashboardId);
		grTabs.query();

		while (grTabs.next()) {
			tab = {};
			tabId = grTabs.getDisplayValue('sys_id');
			tab = {
				id: tabId,
				name: grTabs.getDisplayValue('tab'),
				uuid: gs.generateGUID(),
				type: this._NODE_TYPES.TAB,
				isLeafNode: this._isTabLeafNode(grTabs.getDisplayValue('tab.sys_id')),
				tabUniqueId: grTabs.getDisplayValue('tab.sys_id'),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.TAB, grTabs.getDisplayValue('tab.sys_id')),
			};
			tabs.push(tab);
		}
		if (isDashboardIdPassed)
			return tabs;
		response = this._getDashboardInfo(dashboardId);
		response.children = tabs;
		this.setXMLResult('dashboard', response);
		return JSON.stringify(response);
	},
	getDashboardBreakdownSource: function () {
		var dashboardId = this.getParameter('sysparm_dashboard_id');
		var breakdownSources = [];
		var breakdown = {};
		var breakdownId = null;
		var breakDownRec = null;
		var sourceTable = null;
		var paAdminConsoleIFilter = new PAAdminConsoleIFilterHelper();

		var grBreakdown = new GlideRecordSecure(this._TABLES.PA_BREAKDOWN_SOURCE);
		grBreakdown.addActiveQuery();
		grBreakdown.addQuery('dashboard', '=', dashboardId);
		grBreakdown.query();
		while (grBreakdown.next()) {
			breakdown = {};
			breakdownId = grBreakdown.getDisplayValue('breakdown_source.sys_id');
			breakDownRec = new GlideRecordSecure(this._TABLES.PA_DIMENSIONS);
			if (breakDownRec.get(breakdownId))
				breakdown.tooltip = this.paAdminConsoleAdditionalInfo._getTooltipInfo('breakdown_source', breakDownRec);
			sourceTable = this._getTableDisplayName(grBreakdown.getDisplayValue('breakdown_source.facts_table'));
			breakdown = {
				id: breakdownId,
				name: breakDownRec.getDisplayValue('name') || '',
				uuid: gs.generateGUID(),
				type: this._NODE_TYPES.BREAKDOWN_SOURCE,
				facts_table: grBreakdown.getDisplayValue('breakdown_source.facts_table'),
				_children: [{
					id: grBreakdown.getDisplayValue('breakdown_source.facts_table'),
					name: sourceTable.name,
					sourceTableType: sourceTable.type,
					type: this._NODE_TYPES.SOURCE_TABLE,
					isLeafNode: true,
					uuid: gs.generateGUID(),
					tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, grBreakdown.getDisplayValue('breakdown_source.facts_table')),
				}],
			};


			if (typeof grBreakdown.getValue('publisher') == 'string')
				breakdown._children = breakdown._children.concat(paAdminConsoleIFilter._getWidgetsDetailsForFilter(grBreakdown.getDisplayValue('publisher.sys_id')));

			breakdownSources.push(breakdown);
		}
		return breakdownSources;
	},
	getWidgetListForaTab: function () {
		var self = this;
		var response = {};
		var tabId = this.getParameter('sysparm_tab_id');
		var widgets = this._getWidgetsForaTab(tabId);

		response = this._getTabInfo(tabId);
		widgets = widgets.filter(function(item) {
			return self._isValidForDisplay(item);
		});
		if (widgets.length > 0)
			response.children = widgets;
		else
			response.isLeafNode = true; 	
		this.setXMLResult('children', response);
		return JSON.stringify(response);
	},
    /**
	 * This is called for adminconsole widgets
     * Get Widget records form Filtered Table and Filter Table Id
     * Parameters accepted:
     * sysparm_filter_table -> pa_dashboards_group, pa_dashboards, pa_m2m_dashboard_tabs
     * sysparm_filter_table_id
     **/
	getWidgetRecords: function () {
		var filterTable = this.getParameter('sysparm_filter_table');
		var filterTableId = this.getParameter('sysparm_filter_table_id');
		var result = this.newItem('result');
		result.setAttribute('widgets', JSON.stringify(this._getWidgets(filterTable, filterTableId)));
		return JSON.stringify(result);
	},
    /**
     * Parameters accepted:
     * sysparm_widget_id
     * sysparm_renderer
     * sysparm_record_type: indicator/indicator_source/breakdown/breakdown_source/indicator_jobs/script/report_source
     **/
	getWidgetDetails: function (widgetId, renderer, recordType) {
		var self = this;
		var recordTypeExist = null;
		var result = null;
		var response = {};
		widgetId = widgetId || self.getParameter('sysparm_widget_id');
		renderer = renderer || self.getParameter('sysparm_renderer');
		recordType = recordType || self.getParameter('sysparm_record_type');
		recordTypeExist = recordType && recordType !== '';
		if (!recordTypeExist)
			recordType = '';

		response = self._getWidgetInfoFromTable(widgetId, renderer, recordType);
		response.children = self._getWidgetChildren(widgetId, renderer, recordType);

		if (response.children.length === 0)
			response.isLeafNode = true;
		result = self.newItem('result');
		if (recordTypeExist)
			result.setAttribute(recordType, JSON.stringify(self.getRecordsFromType(response, recordType)));
		else
			result.setAttribute('widget', JSON.stringify(response));
		return JSON.stringify(result);
	},
    /**
     * Parameters accepted:
     * sysparm_filter_table: pa_dashboards_group/pa_dashboards/pa_m2m_dashboard_tabs
     * sysparm_filter_table_id: sys_id
     * sysparm_record_type: indicator/indicator_source/breakdown/breakdown_source/indicator_jobs/script/report_source
     **/
	getWidgetsDetails: function () {
		var self = this;
		var widgets = null;
		var result = null;
		var filterTable = self.getParameter('sysparm_filter_table');
		var filterTableId = self.getParameter('sysparm_filter_table_id');
		var recordType = self.getParameter('sysparm_record_type');
		var recordTypeExist = recordType && recordType !== '';
		if (!recordTypeExist)
			recordType = '';
		widgets = self._getWidgets(filterTable, filterTableId);
		widgets.forEach(function (widget) {
			widget.children = self._getWidgetChildren(widget.id, widget.renderer, recordType);
		});
		result = self.newItem('result');
		if (recordTypeExist)
			result.setAttribute(recordType, JSON.stringify(self._getRecordsFromType(widgets, recordType)));
		else
			result.setAttribute('widgets', JSON.stringify(widgets));
		return JSON.stringify(result);
	},
	getInteractiveFilter: function () {
		var response = {};
		var paAdminConsoleIFilter = new PAAdminConsoleIFilterHelper();
		var id = this.getParameter('sysparm_sys_id');
		var filterRecord = paAdminConsoleIFilter._getInteractiveFilterRecord(id);
		var filter = paAdminConsoleIFilter._getInteractiveFilterDetails(filterRecord);
		response = filter;
		response.children = paAdminConsoleIFilter._getIFChildren(filterRecord);
		if (response.children.length === 0)
			response.isLeafNode = true;
		this.setXMLResult('interactive_filter', response);
		return JSON.stringify(response);
	},
	getReport: function () {
		var self = this;
		var sysID = self.getParameter('sysparm_sys_id');
		var response = self._getWidgetsDetailsForReport(sysID, true);
		if (response && response.length)
			response = response[0];
		this.setXMLResult('report', response);
		return JSON.stringify(response);
	},
	getBreakDown: function () {
		var self = this;
		var response;
		var sysID = self.getParameter('sysparm_sys_id');
		var paBreakdowns = new GlideRecord(this._TABLES.PA_BREAKDOWNS);
		if (sysID && paBreakdowns.get(sysID))
			response = this._getBreakDownDetails(paBreakdowns, sysID, '', true);

		if (response && response.length)
			response = response[0];

		this.setXMLResult('breakdown', response);
		return JSON.stringify(response);
	},
	getBreakdownSourceData: function () {
		var self = this;
		var sysID = self.getParameter('sysparm_sys_id');
		var response = self.getBreakDownSource(sysID, true);
		if (response && response.length)
			response = response[0];
		this.setXMLResult('breakdown_source', response);
		return JSON.stringify(response);
	},
	getIndicatorSource: function () {
		var self = this;
		var sysID = self.getParameter('sysparm_sys_id');
		var response = self._getIndicatorSourceDetails(sysID, '', true);
		if (response && response.length)
			response = response[0];

		this.setXMLResult('indicator_source', response);
		return JSON.stringify(response);
	},
	getScript: function () {
		var self = this;
		var sysID = self.getParameter('sysparm_sys_id');
		var response;
		response = self._getIndicatorScript(sysID, true);
		if (response && response.length)
			response = response[0];
		else
			response = {};

		this.setXMLResult('script', response);
		return JSON.stringify(response);
	},
	getIndicator: function () {
		var self = this;
		var sysID = self.getParameter('sysparm_sys_id');
		var response;
		var paIndicator = new GlideRecord(this._TABLES.PA_INDICATORS);
		if (sysID && paIndicator.get(sysID))
			response = self._getIndicatorDetails(paIndicator, sysID, '', true);
		if (response && response.length)
			response = response[0];

		this.setXMLResult('indicator', response);
		return JSON.stringify(response);
	},
	getLandingPageStats: function () {
		var resp = {};
		var hasRole = gs.hasRole('admin') || gs.hasRole('pa_admin');
		resp.hasRole = hasRole;
		if (!hasRole)
			return JSON.stringify(resp);
		resp.guidedSetup = {};
		resp.guidedSetup.percentComplete = this._getGuidedSetUpPercentCompleted();
		resp.guidedSetup.inactiveContentPacks = parseInt(this._getInactiveContentPackCount(), 10);
		resp.manage = {};
		resp.manage.dashboardGroups = parseInt(this._getDashboardGroupsCount(), 10);
		resp.manage.dashboards = parseInt(this._getDashboardsCount(), 10);
		resp.troubleshoot = {};
		if (pm.isActive('com.snc.pa.diagnostics'))
			resp.troubleshoot.diagnosticErrors = this._getDiagnosticErrors();
		resp.troubleshoot.failedJobs = this._getFailedJobsCount();
		resp.isPremium = SNC.PAUtils.isPremium();
		return JSON.stringify(resp);
	},
	getBreakDownSource: function (dimensionID, isChildren) {
		var breakdownSources = [];
		var chilrenName = isChildren ? 'children' : '_children';
		var sourceTable;
		var breakDownSource;
		var gr = new GlideRecordSecure(this._TABLES.PA_DIMENSIONS);
		gr.addQuery('sys_id', '=', dimensionID);
		gr.query();
		while (gr.next()) {
			sourceTable = this._getTableDisplayName(gr.getValue('facts_table'));
			breakDownSource = {
				name: gr.getDisplayValue('name'),
				id: gr.getValue('sys_id'),
				uuid: gs.generateGUID(),
				type: this._NODE_TYPES.BREAKDOWN_SOURCE,
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.BREAKDOWN_SOURCE, gr),
				facts_table: gr.getDisplayValue('facts_table'),			
			};
			breakDownSource[chilrenName] = [{
				id: gr.getValue('facts_table'),
				name: sourceTable.name,
				sourceTableType: sourceTable.type,
				type: this._NODE_TYPES.SOURCE_TABLE,
				isLeafNode: true,
				uuid: gs.generateGUID(),
				tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.SOURCE_TABLE, gr.getValue('facts_table')),
			}];
			breakdownSources.push(breakDownSource);
		}
		return breakdownSources;
	},
	executeJob: function () {
		var jobID = this.getParameter('sysparm_job_id');
		var response = {jobID: jobID};
		var current;
		if (jobID != null) {
			current = new GlideRecordSecure(this._TABLES.SYSAUTO_PA);
			if (current.get(jobID) && !current.isNewRecord() && current.canRead() && current.canWrite() && !current.getED().getBooleanAttribute('disable_execute_now')
				&& new SNC.PADomainUtils().isWriteable(this._TABLES.SYSAUTO_PA, current.sys_id)) {
				current.update();
				SncTriggerSynchronizer.executeNow(current);
			}
		}
		this.setXMLResult('execute_job', response);
		return JSON.stringify(response);
	},
	_setAllGroups: function(allGroups, parsedEQuery, dGrp, query, groupIdsList) {
		if (allGroups.length === 0 && parsedEQuery.pa_dashboards_group) {
			dGrp = new GlideRecord(this._TABLES.PA_DASHBOARDS_GROUP);
			query = parsedEQuery.pa_dashboards_group.replace('group', 'sys_id');
			dGrp.addEncodedQuery(query);
			dGrp.query();
			if (dGrp.next())
				allGroups = [{
					id: dGrp.getDisplayValue('sys_id'),
					name: dGrp.getDisplayValue('sys_name'),
					uuid: gs.generateGUID(),
					type: this._NODE_TYPES.GROUP,
					isLeafNode: true,
					tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.GROUP, dGrp),
				}];
		}
		if (!parsedEQuery.pa_dashboards_group && !parsedEQuery.pa_dashboards) {
			dGrp = new GlideRecord(this._TABLES.PA_DASHBOARDS_GROUP);
			dGrp.addQuery('sys_id', 'NOT IN', groupIdsList.join(','));
			dGrp.query();
			while (dGrp.next())
				allGroups.push({
					id: dGrp.getDisplayValue('sys_id'),
					name: dGrp.getDisplayValue('sys_name'),
					uuid: gs.generateGUID(),
					type: this._NODE_TYPES.GROUP,
					isLeafNode: true,
					tooltip: this.paAdminConsoleAdditionalInfo._getTooltipInfo(this._NODE_TYPES.GROUP, dGrp),
				});
		}
		return allGroups;
	},
	getUserPreferences: function() {
        var sysId = this.getParameter('sysparm_sys_id') || '-1';
        var response = {};
        var enablePersistence = gs.getProperty('com.snc.pa.treeview.enable_persistence') || 'true';
        var currentUser = gs.getSession().getUser();
		var preferences = currentUser.getPreference('com.snc.pa.administration.console') || '{}';
        var prefObj = JSON.parse(preferences);
        if(prefObj[sysId]) {
            response = prefObj[sysId];
        }
        return JSON.stringify(response);
    },	
	getReportSource: function() {
		var self = this;
		var sysID = self.getParameter('sysparm_sys_id');
		var response = this._getReportSource(sysID);
		this.setXMLResult('report_source', response);
		return JSON.stringify(response);
	},
	getSourceTable: function () {
		var response = {};
		var paAdminConsoleIFilter = new PAAdminConsoleIFilterHelper();
		var tableName = this.getParameter('sysparm_table_name');
		if(tableName)
			response = this._getSourceTable(tableName);
		this.setXMLResult('source_table', response);
		return JSON.stringify(response);
	},
	type: 'PAAdminConsoleUtil',
});
```