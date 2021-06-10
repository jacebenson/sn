---
title: "PAIndicatorBreakdownUtil"
id: "paindicatorbreakdownutil"
---

API Name: global.PAIndicatorBreakdownUtil

```js
var PAIndicatorBreakdownUtil = Class.create();
PAIndicatorBreakdownUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	PA_BREAKDOWNS: 'pa_breakdowns',
	PA_BREAKDOWN_SOURCE: 'pa_dimensions',
	PA_BREAKDOWN_MAPPING: 'pa_breakdown_mappings',
	PA_INDICATION_BREAKDOWN_MAPPING: 'pa_indicator_breakdowns',
	PA_INDICATOR_SOURCE: 'pa_cubes',
	PA_INDICATORS: 'pa_indicators',
	SYS_DICTIONARY: 'sys_dictionary',
	SYS_DB_VIEW: 'sys_db_view',
	SYS_DB_VIEW_TABLE: 'sys_db_view_table',
	AUTOMATED_BREAKDOWN: '1',
	EXTERNAL_BREAKDOWN: '3',
	FIELD_LABEL_SEPARATOR: ' . ',
	getUnMappedBreakdowns: function(){
		var indicatorSyId = this.getParameter('sysparm_indicator');
		var keyword = this.getParameter('sysparm_search');
		var page = this.getParameter('sysparm_page') || 0;
		var pageSize = this.getParameter('sysparm_page_size') || 0;
		var breakdowns = this._getUnMappedBreakdowns(indicatorSyId, keyword, page, pageSize);
		return breakdowns;
	},
	getEnabledBreakdowns: function(){
		var indicatorSyId = this.getParameter('sysparm_indicator');
		var keyword = this.getParameter('sysparm_search');
		var breakdowns =  this._getEnabledBreakdowns(indicatorSyId, keyword);
		return breakdowns;
	},
	_getUnMappedBreakdowns: function(indicatorSysId, keyword, page, pageSize){
		var breakdowns = [];
		var mappedBreakdowns = this._getBreakdownsForIndicator(indicatorSysId);
		var indicator = this._getIndicator(indicatorSysId);
        var grBreakdowns = new GlideRecordSecure(this.PA_BREAKDOWNS);
		grBreakdowns.addActiveQuery();
		grBreakdowns.addQuery("type", "!=", this.EXTERNAL_BREAKDOWN);
		grBreakdowns.addQuery("sys_id","NOT IN",mappedBreakdowns.sysIds);
		if(keyword)
			grBreakdowns.addQuery("name","CONTAINS",keyword);
		var lastRow = 0;
		var startRow = 0;
		if(page > 0 && pageSize > 0) {
			lastRow = page * pageSize;
			startRow = lastRow - pageSize;
			grBreakdowns.chooseWindow(startRow, lastRow, true);
		}
		grBreakdowns.orderBy('name');
		grBreakdowns.query();
		var isLastPage = false;
		var rowCount = grBreakdowns.getRowCount();
		if(page > 0 && pageSize > 0) {
			if(rowCount <= lastRow)
				isLastPage = true;
		}
		while(grBreakdowns.next()){
			var breakdownMappings = this._getIndicatorBreakdownMappings(indicator,grBreakdowns.getValue("sys_id"));
			var hasBreakdownMapping = grBreakdowns.getValue("type") != this.AUTOMATED_BREAKDOWN || this._hasBreakdownMapping(breakdownMappings);
			breakdowns.push({
				name: grBreakdowns.getValue("name"),
				sysId:grBreakdowns.getValue("sys_id"),
				type:grBreakdowns.getValue("type"),
				breakdownSource: this._getBreakdownSource(grBreakdowns.getValue("dimension")),
				breakdownMappings:breakdownMappings,
				hasBreakdownMapping: hasBreakdownMapping,
				isLinkedToIndicator: false,
				indicatorType: indicator.type
			});
		}
		var breakdownData = {
			breakdowns: breakdowns,
			isLastBreakdown: isLastPage,
			count: rowCount,
		};

		return JSON.stringify({indicator:indicator, breakdowns: breakdownData});
	},
	_getEnabledBreakdowns: function(indicatorSysId, keyword){
		var breakdowns = [];
		var mappedBreakdowns = this._getBreakdownsForIndicator(indicatorSysId);
		var indicator = this._getIndicator(indicatorSysId);
        var grBreakdowns = new GlideRecordSecure(this.PA_BREAKDOWNS);
		grBreakdowns.addActiveQuery();
		grBreakdowns.addQuery("type", "!=", this.EXTERNAL_BREAKDOWN);
		grBreakdowns.addQuery("sys_id","IN",mappedBreakdowns.sysIds);

		if(keyword)
			grBreakdowns.addQuery("name","CONTAINS",keyword);
		grBreakdowns.orderBy('name');
		grBreakdowns.query();
		while(grBreakdowns.next()){
			var breakdownMappings = this._getIndicatorBreakdownMappings(indicator,grBreakdowns.getValue("sys_id"));
			breakdowns.push({
				name: grBreakdowns.getValue("name"),
				sysId:grBreakdowns.getValue("sys_id"),
				type:grBreakdowns.getValue("type"),
				breakdownSource: this._getBreakdownSource(grBreakdowns.getValue("dimension")),
				breakdownMappings:breakdownMappings,
				hasBreakdownMapping: grBreakdowns.getValue("type") != this.AUTOMATED_BREAKDOWN  || this._hasBreakdownMapping(breakdownMappings),
				isLinkedToIndicator: true,
				breakdownIndicatorLink: this._getBreakdownsLinkForIndicator(indicatorSysId,grBreakdowns.getValue("sys_id")),
				indicatorType: indicator.type
			});
		}

		return JSON.stringify({indicator:indicator, breakdowns: breakdowns});
	},
	_getBreakdownsForIndicator:function(indicatorSysId){
		var mappedBreakdowns = {
			sysIds: [],
			records: [],
		};
		var grIBDM = new GlideRecordSecure(this.PA_INDICATION_BREAKDOWN_MAPPING);
		grIBDM.addActiveQuery();
		grIBDM.addQuery("indicator","=",indicatorSysId);
		grIBDM.query();
		while(grIBDM.next()){
			mappedBreakdowns.sysIds.push(grIBDM.getValue("breakdown"));
			mappedBreakdowns.records.push({
				indicatorSysId: grIBDM.getValue("indicator"),
				breakdownSysId: grIBDM.getValue("breakdown"),
				sysId: grIBDM.getValue("sys_id")
			});
		}

		return mappedBreakdowns;
	},
	_getBreakdownsLinkForIndicator:function(indicatorSysId, breakdownSysId){
		var linkedBreakdownIndicatorDetails = {};
		var grIBDM = new GlideRecordSecure(this.PA_INDICATION_BREAKDOWN_MAPPING);
		grIBDM.addActiveQuery();
		grIBDM.addQuery("indicator","=",indicatorSysId);
		grIBDM.addQuery("breakdown","=",breakdownSysId);
		grIBDM.query();
		while(grIBDM.next()){
			linkedBreakdownIndicatorDetails = {
				indicatorSysId: grIBDM.getValue("indicator"),
				breakdownSysId: grIBDM.getValue("breakdown"),
				sysId: grIBDM.getValue("sys_id")
			};
		}

		return linkedBreakdownIndicatorDetails;
	},
	_getBreakdownSource: function(breakdownSysId){
		var breakdownSource = {};
		var grBS = new GlideRecordSecure(this.PA_BREAKDOWN_SOURCE);
		grBS.get(breakdownSysId);
		grBS.query();
		if (grBS.isValidRecord()) {
			breakdownSource = {
				sysId: grBS.getValue("sys_id"),
				name: grBS.getValue("name"),
				factsTable: grBS.getValue("facts_table"),
				field: grBS.getValue("field"),
				conditions: grBS.getValue("conditions"),
				recordCount: this._getTableRowCount(grBS.getValue("facts_table"),grBS.getValue("conditions")),
			};
		}
		return breakdownSource;
	},
	_getIndicator: function(indicatorSysId){
		var indicator = {};
		var gr = new GlideRecordSecure(this.PA_INDICATORS);
		gr.get(indicatorSysId);
		gr.query();
		if (gr.isValidRecord()) {
			indicator = {
				sysId: gr.getValue("sys_id"),
				name: gr.getValue("name"),
				isScripted: gr.getValue("scripted"),
				script: gr.getValue("script"),
				conditions: gr.getValue("conditions"),
				cube: gr.getValue("cube"),
				formula: gr.getValue("formula"),
				type: gr.getValue("type"),
				indicatorSource: this._getIndicatorSource(gr.getValue("cube"))
			};
		}
		return indicator;
	},

	_getIndicatorSource: function(cubeId){
		var indicatorSource = {};

		if(cubeId){
			var gr = new GlideRecordSecure(this.PA_INDICATOR_SOURCE);
			gr.get(cubeId);
			gr.query();
			if (gr.isValidRecord()) {
				indicatorSource = {
					sysId: gr.getValue("sys_id"),
					name: gr.getValue("name"),
					factsTable: gr.getValue("facts_table"),
					conditions: gr.getValue("conditions"),
				};
			}
		}

		return indicatorSource;
	},
	_getIndicatorBreakdownMappings: function(indicator,breakdownSysId){
		var indicatorBreakdownMappings = [];

		var FORMULA_INDICATOR = "2";
		if(indicator.cube && indicator.cube.length >0){
		   indicatorBreakdownMappings = [this._getBreakdownMappingDetails(indicator, breakdownSysId)];
		}
		if(indicator.type == FORMULA_INDICATOR && indicator.formula && indicator.formula.trim().length > 0) {
			var formulaIndicatorSysIds = this._getFormulaIndicatorSysId(indicator.formula);
			indicatorBreakdownMappings = [];

			for(var i =0 ; i < formulaIndicatorSysIds.length ;i ++){
				var formulaIndicator = this._getIndicator(formulaIndicatorSysIds[i]);
				var breakdownMappingDetails = this._getBreakdownMappingDetails(formulaIndicator,breakdownSysId);
				indicatorBreakdownMappings.push(breakdownMappingDetails);
			}
		}


		return indicatorBreakdownMappings;
	},
	_getBreakdownMappingDetails : function(indicator, breakdownSysId){
		var indicatorBreakdownMapping = {};
		var gr = new GlideRecordSecure(this.PA_BREAKDOWN_MAPPING);
		gr.addActiveQuery();
		gr.addQuery('breakdown','=',breakdownSysId);
		var tables = this._getHierarchyTables(indicator.indicatorSource.factsTable);
		gr.addQuery('facts_table',tables);
		gr.query();
		indicatorBreakdownMapping.hasMapping = gr.getRowCount() > 0 ;
		while (gr.next()) {
			indicatorBreakdownMapping.factsTable = gr.getValue("facts_table");
			var field = gr.getValue("field");
			if(field) {
				indicatorBreakdownMapping.fieldLabel = this._getFieldLabel(field.split('.'), gr.getValue("facts_table"), []);
			}
			indicatorBreakdownMapping.field = gr.getValue("field");
			indicatorBreakdownMapping.isScripted = gr.getValue("scripted") === "1";
			indicatorBreakdownMapping.script = gr.getValue("script");
			indicatorBreakdownMapping.scriptName = gr.getDisplayValue("script");
		}
		indicatorBreakdownMapping.indicator = indicator;
		return indicatorBreakdownMapping;
	},
	_getHierarchyTables: function(tableName) {
		if(tableName)
			return GlideDBObjectManager.getTables(tableName);
		else
			return [];
	},
	_getFormulaIndicatorSysId: function(formula){
		var regPattern = /[0-9a-f]{8}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{12}/g;
		return formula.match(regPattern);

	},
	_getTableRowCount: function(table,encodedQuery){
		var count = new GlideAggregate(table);
		if(encodedQuery)
		  count.addEncodedQuery(encodedQuery);
		count.addAggregate('COUNT');
		count.query();
		var recCount = 0;
		if (count.next()) {
		   recCount = count.getAggregate('COUNT');
		}

		return recCount;
	},
	_hasBreakdownMapping: function(breakdownMappings){
		var hasBreakdownMappingDone = false;
		for(var i = 0; i< breakdownMappings.length ; i++){
			if(breakdownMappings[i].hasMapping){
				hasBreakdownMappingDone = true;
				break;
			}
		}
		return hasBreakdownMappingDone;

     },
	_getTableNameFromView: function(field, viewSysID) {
		var prefixMap = {};
		var response = [];
		var grViewTable = new GlideRecord(this.SYS_DB_VIEW_TABLE);
		grViewTable.addQuery('view', viewSysID);
		grViewTable.query();
		while(grViewTable.next()) {
			var prefix = grViewTable.getValue('variable_prefix');
			var tableName = grViewTable.getValue('table');
			prefixMap[prefix] = tableName;
		}
		var varName = field.substr(field.indexOf('_') + 1);
		var varPrefix = field.split('_')[0];
		response.push(varName);
		response.push(prefixMap[varPrefix]);
		return response;
	},
	_getFieldLabel: function(fields, table, labels) {
		var grIsView = new GlideRecord(table);
		if(grIsView.isView()) {
			var grView = new GlideRecord(this.SYS_DB_VIEW);
			grView.get('name',table);
			var viewSysID = grView.getUniqueValue();
			var fieldTable = this._getTableNameFromView(fields[0], viewSysID);
			fields[0] = fieldTable[0];
			table = fieldTable[1];
		}
		var labelArray = this._getFieldLabelArray(fields, table, labels) || [];
		return labelArray.join(this.FIELD_LABEL_SEPARATOR);
	},
	_getFieldLabelArray: function(fields, table, labels) {
		if(fields.length === 0 || !table) return;
		var gr = new GlideRecord(this.SYS_DICTIONARY);
		var compositeElement =  new GlideCompositeElement(fields[0], table);
		table = compositeElement.getTargetED().getTableName();

		gr.addQuery('name', table);
		gr.addQuery('element', fields[0]);
		gr.query();
		if(gr.next()) {
			var type = gr.getValue('internal_type');
			if(type == 'reference') {
				fields = fields.splice(1,fields.length);
				table =  gr.getValue('reference');
				labels.push(gr.getValue('column_label'));
				this._getFieldLabelArray(fields,table,labels);
			} else
				labels.push(gr.getValue('column_label'));
		}
		return labels;
	},
	type: 'PAIndicatorBreakdownUtil'
});
```