---
title: "PAUtils"
id: "pautils"
---

API Name: global.PAUtils

```js
var PAUtils = Class.create();
PAUtils.prototype = {
	initialize: function() {
	},
	
	getCollectionIDFromURI: function() {
		var collectionID = null;
		var url = gs.action.getGlideURI().toString();
		var args = url.split("&");
		for (var i = 0; i < args.length; i++) {
			var parts = args[i].split("=");
			if (parts[0] == "sysparm_collectionID") {
				collectionID = parts[1];
				break;
			}
		}
		return collectionID;
	},
	
	/**
 	* Only automated indicators are supported for text analytics
 	*/
	ref_qual_indicator_text_phrase: function() {
		var query = 'benchmarking=false^ORbenchmarkingISEMPTY';
		if (current.widget)
			query = query + '^sys_id=' + current.widget.indicator;
		else
			query = query + '^type=1';
		
		return query;
	},
	
	ref_qual_widget_text_phrase: function() {
		var query = 'type=text';
		if (current.indicator) {
			query = query + '^indicator=' + current.indicator;
		}
		return query;
	},
	
	ref_qual_widget_indicator: function() {
		var ref_qual = 'benchmarking=false^ORbenchmarkingISEMPTY';
		if (current.type == 'pivot' || current.type == 'text')
			ref_qual = ref_qual + '^type!=4';
		
		if (current.type != 'text')
			return ref_qual;
		
		var textIndexIndicators = new GlideRecord('pa_m2m_indicator_text_indexes');
		textIndexIndicators.query();
		
		var indicatorsForRefQual = [];
		while (textIndexIndicators.next())
			indicatorsForRefQual.push(textIndexIndicators.getValue('indicator'));
		
		return ref_qual + '^sys_idIN' + indicatorsForRefQual.join(',');
	},
	
	ref_qual_managing_indicator: function(cur_sys_id, type) {
		var gr = new GlideRecord('pa_managed_sources_indicators');
		gr.query();
		var indicator_sysids = [];
		while (gr.next())
			indicator_sysids.push(gr.getValue('indicator'));
		if (indicator_sysids.length === 0)
			return 'sys_id=0';
		
		return 'sys_idIN' + indicator_sysids.toString() + '^sys_id!=' + cur_sys_id + '^type=' + type + '^managing_indicatorISEMPTY^EQ';
	},
	
	ref_qual_managed_breakdown: function(managing_indicator) {
		var gr = new GlideRecord('pa_managed_sources_indicators');
		if (managing_indicator)
			gr.addQuery('indicator', managing_indicator);
		gr.query();
		var managed_source_sysids = [];
		while (gr.next())
			managed_source_sysids.push(gr.getValue('managed_source'));
		if (managed_source_sysids.length === 0)
			return 'sys_id=0';
		
		var breakdown_sysids = [];
		gr = new GlideRecord('pa_managed_sources');
		gr.addQuery('sys_id', 'IN', managed_source_sysids);
		gr.query();
		while (gr.next())
			breakdown_sysids.push(gr.getValue('breakdown'));
		if (breakdown_sysids.length === 0)
			return 'sys_id=0';
		
		return 'sys_idIN' + breakdown_sysids.toString();
	},
	
	ref_qual_indicator_breakdown: function(level, followed) {
		if (!level) {
			level = 1;
		}
		var ids = [];
		var indicator = null;
		var job_indicator = null;
		if (current == null) {
			var url = gs.action.getGlideURI().toString();
			var args = url.split("&");
			for (var i = 0; i < args.length; i++) {
				var parts = args[i].split("=");
				if (parts[0] == "sysparm_collectionID") {
					job_indicator = parts[1];
					break;
				}
			}
			if (job_indicator != null) {
				var gr = new GlideRecord('pa_job_indicators');
				gr.addQuery('sys_id', job_indicator);
				gr.query();
				if (gr.next())
					indicator = gr.getValue("indicator");
			}
		} else if (!current.indicator.nil()) {
			indicator = current.indicator;
		}
		
		if (indicator != null) {
			var has_breakdown_matrix = false;
			var formula_indicator = false;
			var exclusions = {};
				
				var scopedByBreakdown;
				if (current == null) {
					scopedByBreakdown = true;
				} else {
					if (level === 1) {
						scopedByBreakdown = current.breakdown_level2;
					} else if (level === 2) {
						scopedByBreakdown = current.breakdown;
					}
				}
				
				if (followed)
					scopedByBreakdown = current.breakdown;
				
				if (scopedByBreakdown) {
					var indicatorGr = new GlideRecord('pa_indicators');
					indicatorGr.addQuery('sys_id', indicator);
					indicatorGr.query();
					indicatorGr.next();
					has_breakdown_matrix = (indicatorGr.getValue('collect_breakdown_matrix') == true);
					formula_indicator = (indicatorGr.getValue('type') == 2);
						if (has_breakdown_matrix) {
						var indicatorBrekdownExclGr = new GlideRecord('pa_indicator_breakdown_excl');
						indicatorBrekdownExclGr.addQuery('indicator', indicator);
						indicatorBrekdownExclGr.query();
						while (indicatorBrekdownExclGr.next()) {
							exclusions[indicatorBrekdownExclGr.breakdown + ':' + indicatorBrekdownExclGr.breakdown_level2] = true;
							exclusions[indicatorBrekdownExclGr.breakdown_level2 + ':' + indicatorBrekdownExclGr.breakdown] = true;
						}
					}
				}
				
				if (!followed && scopedByBreakdown && !has_breakdown_matrix && !formula_indicator) {
					ids.push("-1");
				} else {
					var indicatorBreakdownGr = new GlideRecord('pa_indicator_breakdowns');
					indicatorBreakdownGr.addQuery('indicator', indicator);
					indicatorBreakdownGr.addActiveQuery();
					indicatorBreakdownGr.query();
					while (indicatorBreakdownGr.next()) {
						var sys_id = indicatorBreakdownGr.breakdown.sys_id;
						
						if (scopedByBreakdown) {
							if (scopedByBreakdown == sys_id) {
								continue;
							}
							if (exclusions[scopedByBreakdown + ':' + sys_id]) {
								continue;
							}
						}
						
						ids.push(sys_id);
					}
				}
			}
			return 'sys_idIN' + ids.toString();
		},
		
		ref_qual_indicator_followed_breakdown: function() {
			if (current.type == "list")
				return '';
			if (current.type == "time" && current.visualization == "relative" && current.tag != "")
				return '';
			return this.ref_qual_indicator_breakdown(1, true);
		},
		
		ref_qual_indicator_followed_breakdown_relation: function() {
			var ids = [];
			if (current.type == 'breakdown' && current.visualization == 'scorecard' && !current.breakdown.nil()) {
				var gr = new GlideRecord('pa_breakdown_relations');
				gr.addQuery('related_breakdown', current.breakdown);
				gr.orderBy('order');
				gr.query();
				while (gr.next())
					ids.push(gr.getValue('sys_id'));
			}
			if (ids.length === 0)
				ids.push('-1');
			return 'sys_idIN' + ids.toString();
		},
		
		ref_qual_script: function(tableElement) {
			return 'tableIN' + this.getTableAncestors(tableElement).toString();
		},
		
		// input: indicator
		// output: allowed breakdowns
		// - you may link any breakdown to the given indicator if it is
		//   a manual indicator or a formula indicator
		// - you may link any manual breakdown to an automated indicator
		// - you may link an automated breakdown to an automated indicator
		//   if it has a mapping where its facts table is equal to the
		//   facts table (or any of its parent tables) of the indicator.
		ref_qual_m2m_indicator_breakdown: function() {
			var indicator = this.getCollectionIDFromURI(),
			tableElement = null;
			if (indicator != null) {
				var gr = new GlideRecord("pa_indicators");
				gr.addQuery('sys_id', indicator);
				gr.query();
				if (gr.next()) {
					// External indicators
					if (gr.getValue("type") == 4)
						return 'type=3';
					
					var cube = new GlideRecord("pa_cubes");
					cube.addQuery('sys_id', gr.getValue("cube"));
					cube.query();
					if (cube.next()) {
						tableElement = cube.getValue("facts_table");
					}
				}
			}
			
			if (!tableElement)
				return '';
			
			var ancestors = this.getTableAncestors(tableElement);
			var mapping = new GlideRecord('pa_breakdown_mappings');
			mapping.addQuery('facts_table', ancestors);
			mapping.query();
			
			var breakdown_ids = [];
			while (mapping.next()) {
				var breakdown = '' + mapping.breakdown;
				var found = false;
				for (var i = 0; i < breakdown_ids.length; i++) {
					if (breakdown_ids[i] === breakdown) {
						found = true;
						break;
					}
				}
				if (!found)
					breakdown_ids.push(breakdown);
			}
			var ref_qual = 'type=2';
			if (breakdown_ids.length > 0)
				ref_qual = ref_qual + '^ORsys_idIN' + breakdown_ids.toString();
			return ref_qual;
		},
		
		// input: breakdown
		// output: allowed indicators
		// - you may link a breakdown to any indicator that shares
		//   the same facts table (or one of its descendants) as any
		//   facts table in the breakdown mappings of the breakdown
		ref_qual_m2m_breakdown_indicator: function() {
			var breakdown = this.getCollectionIDFromURI(),
			tableElements = [];
			
			if (breakdown != null) {
				var gr = new GlideRecord("pa_breakdowns");
				gr.addQuery('sys_id', breakdown);
				gr.query();
				if (gr.next()) {
					// External breakdown
					if (gr.getValue("type") == '3')
						return 'type=4';
					
					if (gr.getValue("type") == '1') {
						var mapping = new GlideRecord('pa_breakdown_mappings');
						mapping.addQuery('breakdown', breakdown);
						mapping.query();
						while (mapping.next()) {
							var tables = this.getTableDecendants(mapping.getValue("facts_table"));
							for (var i = 0; i < tables.length; i++) {
								var found = false;
								for (var j = 0; j < tableElements.length; j++) {
									if (tableElements[j] === tables[i])
										found = true;
								}
								if (!found)
									tableElements.push(tables[i]);
							}
						}
					}
				}
			}
			
			if (tableElements.length === 0)
				return 'benchmarking=false^ORbenchmarkingISEMPTY';
			
			return 'type!=4^benchmarking=false^ORbenchmarkingISEMPTY^cubeISEMPTY^ORcube.facts_tableIN' + tableElements.toString();
		},
		
		ref_qual_default_indicator: function() {
			var ids = [];
			var gr = new GlideRecord('pa_widget_indicators');
			gr.addQuery('widget', current.sys_id);
			gr.addNullQuery('widget_indicator');
			gr.query();
			while (gr.next()) {
				ids.push(String(gr.sys_id));
			}
			return 'sys_idIN' + ids.toString();
		},
		
		ref_qual_breakdown_source_dashboard: function(dashboardSysId) {
			var gr = new GlideRecord('pa_m2m_dashboard_sources');
			gr.addQuery('dashboard', dashboardSysId);
			gr.query();
			var breakdown_source_sysids = [];
			while (gr.next())
				breakdown_source_sysids.push(gr.getValue('breakdown_source'));
			if (breakdown_source_sysids.length === 0)
				return 'sys_id=0';
			
			return 'sys_idIN' + breakdown_source_sysids.toString() + '^EQ';
		},
		
		ref_qual_tabs_dashboard: function(dashboardSysId) {
			var gr = new GlideRecord('pa_m2m_dashboard_tabs');
			gr.addQuery('dashboard', dashboardSysId);
			gr.query();
			var tabs_sysIds = [];
			while (gr.next())
				tabs_sysIds.push(gr.getValue('tab'));
			if (tabs_sysIds.length === 0)
				return 'sys_id=0';
			
			return 'sys_idIN' + tabs_sysIds.toString() + '^EQ';
		},
		
		ref_qual_text_index_configuration_indicator: function() {
			var indicatorSysId = this.getCollectionIDFromURI();
			
			if (indicatorSysId == null)
				if (current.indicator.cube)
				return 'cube=' + current.indicator.cube;
			else
				return '';
			
			var indicator = new GlideRecord('pa_indicators');
			if (!indicator.get(indicatorSysId))
				return '';
			
			return 'cube=' + indicator.getValue('cube');
		},
		
		ref_qual_text_index_configuration_fields: function() {
			var viewTablesString = new SNC.PADBView().getDatabaseViewTables(current.cube.facts_table);
			var viewTables = new JSON().decode(viewTablesString);
			var tables = [];
			
			if (viewTables && viewTables.length > 0)
				for (var i=0; i<viewTables.length; i++) {
				if (i>0)
					tables += ',';
				tables += new TableUtils(viewTables[i]).getTables().toArray().join();
			}
			else
				tables = new TableUtils(current.cube.facts_table).getTables().toArray().join();
			
			var refQual = 'nameIN' + tables + '^elementISNOTEMPTY^internal_type=string^choice=2^ORchoice=0^ORchoice=NULL';
			
			return refQual;
		},
		
		ref_qual_indicator_text_index_configuration: function() {
			var textIndexConfigurationSysId = this.getCollectionIDFromURI();
			var refQualifier = 'type=1^benchmarking=false^ORbenchmarkingISEMPTY';
			
			if (textIndexConfigurationSysId == null)
				if (current.text_index_configuration.cube)
				return refQualifier + '^cube=' + current.text_index_configuration.cube;
			else
				return refQualifier;
			
			var textIndexConfiguration = new GlideRecord('pa_text_index_configurations');
			if (!textIndexConfiguration.get(textIndexConfigurationSysId))
				return refQualifier;
			
			return refQualifier + '^cube=' + textIndexConfiguration.getValue('cube');
		},
		
		ref_qual_indicator_default_aggregate: function(indicatorGR) {
			return 'sys_idIN' + SNC.PAIndicator.getValidAggregates(indicatorGR);
		},
		
		getTableAncestors: function(tableName) {
			var tables = [];
			var ar = GlideDBObjectManager.get().getTables(tableName);
			for (var i = 0; i < ar.size(); i++) {
				tables[i] = ar.get(i);
			}
			return tables;
		},
		
		getTableDecendants: function(tableName) {
			var tables = [];
			var ar = GlideDBObjectManager.get().getAllExtensions(tableName);
			for (var i = 0; i < ar.size(); i++) {
				tables[i] = ar.get(i);
			}
			return tables;
		},
		
		hasBreakdownMapping: function(sys_id, breakdown, facts_table) {
			var mapping = new GlideRecord('pa_breakdown_mappings');
			if (sys_id && sys_id != '')
				mapping.addQuery('sys_id', '!=', sys_id);
			mapping.addQuery('breakdown', breakdown);
			mapping.addQuery('facts_table', facts_table);
			mapping.query();
			return mapping.next() ? true : false;
		},
		
		hasRestrictedOperatorsInConditions: function (conditions) {
			return this.hasKeywordsInConditions(conditions) ||
			this.hasGTFieldInConditions(conditions) ||
			this.hasGTOrEqualInCondition(conditions);
		},
		
		hasKeywordsInConditions: function(conditions) {
			return (conditions.indexOf("123TEXTQUERY321") > -1);
		},
		
		hasGTFieldInConditions: function(conditions) {
			var regex = /(GT|LT)_FIELD/;
			return regex.test(conditions);
		},
		
		hasGTOrEqualInCondition: function(conditions) {
			var regex = /(GT|LT)_OR_EQUALS_FIELD/;
			return regex.test(conditions);
		},
		
		getContributors: function(){
			var contributors = [];
			var userRoles = new GlideRecord('sys_user_has_role');
			userRoles.addQuery('role.name', 'pa_contributor');
			userRoles.query();
			
			while(userRoles.next()){
				contributors.push(userRoles.getValue('user'));
			}
			
			return 'sys_idIN' + contributors.toString();
		},
		
		getAvailableAggregates: function() {
			/*global PAIndicator:true*/
			/*eslint no-undef: "error"*/
			return PAIndicator.getAvailableAggregates(current.indicator);
		},
		
		ref_qual_element_filters: function() {
			/*global PABreakdown:true*/
			/*eslint no-undef: "error"*/
			return PABreakdown.getElementFiltersSysIds(current.breakdown);
		},
		
		ref_qual_pivot_element_filters: function() {
			/*global PABreakdown:true*/
			/*eslint no-undef: "error"*/
			return PABreakdown.getElementFiltersSysIds(current.pivot_breakdown);
		},
		
		// DEPRECATED: use new PAUtils().getSnapshotIDs()
		getSnapshotSysIDs: function(indicator, period, breakdown, element, breakdown_level2, element_level2, aggregate) {
			/*global PASnapshot:true*/
			/*eslint no-undef: "error"*/
			return PASnapshot.getSysIDs(indicator, period, breakdown, element, breakdown_level2, element_level2, aggregate);
		},
		
		getSnapshotIDs: function(uuidScope, period) {
			/*global PASnapshot:true*/
			/*eslint no-undef: "error"*/
			return PASnapshot.getIDs(uuidScope, period);
		},
		
		getCompareSnapshotIDs: function(uuidScope, period1, period2, type) {
			/*global PASnapshot:true*/
			/*eslint no-undef: "error"*/
			return PASnapshot.getCompareIDs(uuidScope, period1, period2, type);
		},
		
		_getIndicator: function(){
			var indicator = null;
			var job_indicator = null;
			if (current == null) {
				var url = gs.action.getGlideURI().toString();
				var args = url.split("&");
				for (var i=0; i<args.length; i++) {
					var parts = args[i].split("=");
					if (parts[0] == "sysparm_collectionID") {
						job_indicator = parts[1];
						break;
					}
				}
				if (job_indicator != null) {
					var gr = new GlideRecord('pa_job_indicators');
					gr.addQuery('sys_id', job_indicator);
					gr.query();
					if (gr.next())
						indicator = gr.getValue("indicator");
				}
			} else if (!current.indicator.nil()) {
				indicator = current.indicator;
			}
			return indicator;
		},
		//Reference qualifier for all the breakdowns of an indicator,
		//ignores matrix/levels/exclusions
		ref_qual_indicator_breakdown_all: function() {
			gs.log("ref_qual_indicator_breakdown_all");
			var ids = [];
			var indicator = this._getIndicator();
			if (indicator !== null) {
				var gr = new GlideRecord('pa_indicator_breakdowns');
				gr.addQuery('indicator', indicator);
				gr.addActiveQuery();
				gr.query();
				while (gr.next()) {
					ids.push(gr.breakdown.sys_id);
				}
			}
			return 'sys_idIN' + ids.toString();
		},
		
		getParamFromGlideURI: function(param) {
			var transaction = GlideTransaction.get();
			if (transaction && transaction.getRequest()) {
				var url = gs.action.getGlideURI().toString();
				var args = url.split("&");
				for (var i = 0; i < args.length; i++) {
					var parts = args[i].split("=");
					if (parts[0] == param)
						return parts[1];
				}
			}
			return "undefined";
		},
		
		usedInFormulaIndicators: function(indicator_sys_id) {
			var formulas = new GlideRecord('pa_indicators');
			formulas.addQuery("type", "2"); // formula indicators only
				formulas.addQuery("formula", "CONTAINS", indicator_sys_id);
				formulas.setLimit(1);
				formulas.query();
				return formulas.hasNext();
		},
		
		getEncodedSnapshotQuery: function(uuid, date, breakdown, elements, filtered_breakdown, elements_filter) {
			return PASnapshot.getEncodedQuery(uuid, date, breakdown, elements, filtered_breakdown, elements_filter);
		},
		
		getEncodedComparedSnapshotQuery: function (uuid, date1, date2, type) {
			return PASnapshot.getEncodedComparedQuery(uuid, date1, date2, type);
		},
		
		// Check if a table has diagnostics defined for
		isDiagnosablePATable: function (tableName) {
			var gr = new GlideRecord('pa_diagnostic');
			gr.addActiveQuery();
			gr.addQuery('table', tableName);
			gr.setLimit(1);
			gr.query();
			return gr.hasNext();
		},

		isScriptedBreakdown: function (breakdownSysId, factTable) {
			if (JSUtil.nil(breakdownSysId) || JSUtil.nil(factTable))
				return false;

			var mapping = new GlideRecord('pa_breakdown_mappings');
			mapping.addQuery('breakdown', breakdownSysId);
			mapping.addQuery('facts_table', factTable);
			mapping.addQuery('scripted', true);
			mapping.query();
			return mapping.hasNext();
		},
		
		getTextWidgetRecordSysId: function (uuid, field, date, drillDownWords) {
			return new PATextRecords(uuid, field).getRecordSysId(date, drillDownWords);
		},
	
	type: 'PAUtils'
};
```