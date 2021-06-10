---
title: "SLACacheManager"
id: "slacachemanager"
---

API Name: global.SLACacheManager

```js
var SLACacheManager = Class.create();

SLACacheManager.SLA_DEF_TABLES_CACHE = "com.snc.sla.def_tables_cache";
SLACacheManager.SLA_BREAKDOWN_DEF_CACHE = "com.snc.sla.breakdown_def_cache";
SLACacheManager.SLA_DEF_SLA_BREAKDOWN_CACHE =  "com.snc.sla.sla_def_sla_breakdown_cache";

SLACacheManager.prototype = {
	_GLOBAL: "global",

    initialize: function() {
		this._initPrivateCacheable(SLACacheManager.SLA_DEF_TABLES_CACHE);
		this._initPrivateCacheable(SLACacheManager.SLA_BREAKDOWN_DEF_CACHE);
		this._initPrivateCacheable(SLACacheManager.SLA_DEF_SLA_BREAKDOWN_CACHE);
	},

	flushDefinitionTables: function() {
        GlideCacheManager.flush(SLACacheManager.SLA_DEF_TABLES_CACHE);
    },

	hasDefinitionForRecord: function(gr) {
		if (!gr || !gr.isValid())
			return false;

		var key = this._buildTableKey(gr.getRecordClassName(), gr.getValue("sys_domain"));
		var hasDefs = GlideCacheManager.get(SLACacheManager.SLA_DEF_TABLES_CACHE, key);
		if (hasDefs === null) {
			hasDefs = this.getDefinitionsForRecord(gr);
			GlideCacheManager.put(SLACacheManager.SLA_DEF_TABLES_CACHE, key, hasDefs);
		}

        return hasDefs;
    },

	getDefinitionsForRecord: function(gr) {
		var slaDefGr = new GlideAggregate("contract_sla");
		slaDefGr.addActiveQuery();
		slaDefGr.addQuery("collection", gr.getRecordClassName());
		slaDefGr.addDomainQuery(gr);
		slaDefGr.addAggregate("COUNT");
		slaDefGr.query();

		if (slaDefGr.next() && parseInt(slaDefGr.getAggregate("COUNT"), 10) > 0)
			return true;

		return false;
	},

    getBreakdownDefinitionsForSLA: function(slaId) {
		var breakdownDefs = {};

		if (!pm.isActive("com.snc.sla.breakdowns"))
			return breakdownDefs;

		if (!slaId)
			return breakdownDefs;

		// First get the ids of the breakdown definitions linked to the SLA Definition
		var breakdownIds = this._getBreakdownIdsForSLA(slaId);
		if (!breakdownIds || breakdownIds.length === 0)
			return breakdownDefs;

		var breakdownId;
		var breakdownDef;
		var uncachedBreakdownIds = [];
		// Where possible get the breakdown definitions from the cache
		for (var i = 0, l = breakdownIds.length; i < l; i++) {
			breakdownId = breakdownIds[i];
			/* We need this test as an earlier version of the caching stored actual Javascript objects instead of a
			   a JSON stringified copy of the object */
			breakdownDef = GlideCacheManager.get(SLACacheManager.SLA_BREAKDOWN_DEF_CACHE, breakdownId);
			if (breakdownDef instanceof String)
				breakdownDef = JSON.parse(breakdownDef);
			if (breakdownDef !== null)
				breakdownDefs[breakdownId] = breakdownDef;
			else
				uncachedBreakdownIds.push(breakdownId);
		}

		// For the breakdown defs we need that weren't in the cache, get them from the DB
		var queriedBreakdownDefs = this._getBreakdownDefinitionsByIds(uncachedBreakdownIds);
		uncachedBreakdownIds = Object.keys(queriedBreakdownDefs);

		// And then add them into the cache and the object we return
		for (var j = 0, n = uncachedBreakdownIds.length; j < n; j++) {
			breakdownId = uncachedBreakdownIds[j];
			GlideCacheManager.put(SLACacheManager.SLA_BREAKDOWN_DEF_CACHE, breakdownId, JSON.stringify(queriedBreakdownDefs[breakdownId]));
			breakdownDefs[breakdownId] = queriedBreakdownDefs[breakdownId];
		}

        return breakdownDefs;
    },

	_getBreakdownIdsForSLA: function(slaId) {
		var breakdownIds = [];

		if (!slaId)
			return breakdownIds;

		breakdownIds = GlideCacheManager.get(SLACacheManager.SLA_DEF_SLA_BREAKDOWN_CACHE, slaId);
		/* We need this test as an earlier version of the caching stored actual Javascript arrays instead of a
		   a JSON stringified copy of the array */
		if (breakdownIds instanceof String)
			breakdownIds = JSON.parse(breakdownIds);
		if (breakdownIds === null) {
			breakdownIds = new SLABreakdownUtils().getBreakdownDefIdsForSLA(slaId);
			if (breakdownIds !== null)
				GlideCacheManager.put(SLACacheManager.SLA_DEF_SLA_BREAKDOWN_CACHE, slaId, JSON.stringify(breakdownIds));
		}

        return breakdownIds;
	},

    _getBreakdownDefinitionsByIds: function(breakdownIds) {
		var breakdownDefinitionsData = {};

		if (!breakdownIds || breakdownIds.lengh === 0)
			return breakdownDefinitionsData;

		var breakdownFieldGr = new GlideRecord(sn_sla_brkdwn.SLABreakdown.SLA_BREAKDOWN_DEFINITION_FIELD);
		breakdownFieldGr.addQuery("sla_breakdown_definition", breakdownIds);
		breakdownFieldGr.addQuery("sla_breakdown_definition.active", "true");
		breakdownFieldGr.orderBy("sla_breakdown_definition");
		breakdownFieldGr.query();

		var breakdownDefinitionId;
		var breakdownTableName;
		var taskTableName;
		var sourceFieldName;
		var breakdownFieldName;
		var td;

		while (breakdownFieldGr.next()) {
			breakdownTableName = breakdownFieldGr[sn_sla_brkdwn.SLABreakdown.SLA_BREAKDOWN_DEFINITION].sla_breakdown_table + "";
			if (!breakdownTableName)
				continue;

			td = GlideTableDescriptor.get(breakdownTableName);
			if (!td.isValid())
				continue;

			breakdownFieldName = breakdownFieldGr.getValue("breakdown_field_name");
			if (!td.isValidField(breakdownFieldName))
				continue;

			taskTableName = breakdownFieldGr[sn_sla_brkdwn.SLABreakdown.SLA_BREAKDOWN_DEFINITION].task_table + "";
			if (!taskTableName)
				continue;

			td = GlideTableDescriptor.get(taskTableName);
			if (!td.isValid())
				continue;

			sourceFieldName = breakdownFieldGr.getValue("source_field_name");
			if (!td.isValidField(sourceFieldName))
				continue;

			breakdownDefinitionId = breakdownFieldGr.getValue("sla_breakdown_definition");
			if (!breakdownDefinitionsData[breakdownDefinitionId])
				breakdownDefinitionsData[breakdownDefinitionId] = {taskTable: taskTableName,
																   breakdownTable: breakdownTableName,
																   breakdownFields: []};

			breakdownDefinitionsData[breakdownDefinitionId].breakdownFields.push({sourceFieldName: sourceFieldName,
																				  breakdownFieldName: breakdownFieldName});
		}

        return breakdownDefinitionsData;
    },

	_initPrivateCacheable: function(name) {
		if (!name)
			return;

		if (GlideCacheManager.get(name, "_created_") != null)
			return;

		GlideCacheManager.addPrivateCacheable(name);
		GlideCacheManager.put(name, "_created_", new GlideDateTime().getNumericValue());
	},

    _buildTableKey: function(table, domain){
		if (!domain)
			domain = this._GLOBAL;

        return table + "_" + domain;
    },

    type: "SLACacheManager"
};

SLACacheManager.flushDefinitionTables = function() {
	GlideCacheManager.flush(SLACacheManager.SLA_DEF_TABLES_CACHE);
};

SLACacheManager.flushBreakdownDefinitions = function() {
	GlideCacheManager.flush(SLACacheManager.SLA_BREAKDOWN_DEF_CACHE);
};

SLACacheManager.flushSLADefSLABreakdowns = function() {
	GlideCacheManager.flush(SLACacheManager.SLA_DEF_SLA_BREAKDOWN_CACHE);
};
```